import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Organization, OrgMemberRole } from '@/types/database'
import { logger } from '@/lib/logger'

// Type for org membership with organization data
interface OrgMembership {
  role: OrgMemberRole
  organization: Organization
}

// User type: 'student' has no org memberships, 'teacher' has org memberships
export type UserType = 'student' | 'teacher' | null

interface AuthContextType {
  // Auth state
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isInitialized: boolean // true once initial auth check is complete

  // User type
  userType: UserType

  // Organization state (only for teachers)
  currentOrganization: Organization | null
  organizations: Organization[]
  userRole: OrgMemberRole | null

  // Auth methods
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>

  // Organization methods
  ensureOrganization: (name: string, slug: string) => Promise<{ organization: Organization | null; error: Error | null }>
  switchOrganization: (organizationId: string) => void
  refreshOrganizations: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper functions outside component
async function fetchProfileData(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    logger.error('Error fetching profile:', error)
    return null
  }

  return data
}

async function fetchOrganizationsData(userId: string): Promise<{ organizations: Organization[], memberships: OrgMembership[] }> {
  const { data: memberships, error: memberError } = await supabase
    .from('org_members')
    .select(`
      role,
      organization:organizations(*)
    `)
    .eq('user_id', userId)

  if (memberError) {
    logger.error('Error fetching organizations:', memberError)
    return { organizations: [], memberships: [] }
  }

  const typedMemberships = (memberships || []) as unknown as OrgMembership[]
  const orgs = typedMemberships.map((m) => m.organization).filter(Boolean)

  return { organizations: orgs, memberships: typedMemberships }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  const [userType, setUserType] = useState<UserType>(null)
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [userRole, setUserRole] = useState<OrgMemberRole | null>(null)

  // Refs to track values without causing re-renders in callbacks
  const currentOrgRef = useRef<Organization | null>(null)
  currentOrgRef.current = currentOrganization

  const userRef = useRef<User | null>(null)
  userRef.current = user

  const organizationsRef = useRef<Organization[]>([])
  organizationsRef.current = organizations

  // Load user data (profile + organizations)
  // Returns false if the user no longer exists server-side (stale session)
  const loadUserData = useCallback(async (userId: string): Promise<boolean> => {
    // Verify user still exists server-side (getSession only reads cached JWT)
    const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser()
    if (userError || !verifiedUser) {
      logger.error('User no longer exists server-side, signing out')
      await supabase.auth.signOut()
      return false
    }

    const userProfile = await fetchProfileData(userId)
    if (!userProfile) {
      // Profile doesn't exist — user data was deleted. Sign out the stale session.
      logger.error('Profile not found for authenticated user, signing out')
      await supabase.auth.signOut()
      return false
    }
    setProfile(userProfile)

    const { organizations: orgs, memberships } = await fetchOrganizationsData(userId)
    setOrganizations(orgs)

    // Determine user type: teacher if has org memberships, student if not
    if (orgs.length > 0) {
      setUserType('teacher')

      // Set current organization if not already set
      if (!currentOrgRef.current) {
        const savedOrgId = localStorage.getItem('currentOrganizationId')
        const savedOrg = orgs.find((o) => o.id === savedOrgId)
        const orgToSet = savedOrg || orgs[0]

        setCurrentOrganization(orgToSet)
        localStorage.setItem('currentOrganizationId', orgToSet.id)

        const membership = memberships.find((m) => m.organization?.id === orgToSet.id)
        setUserRole(membership?.role || null)
      }
    } else {
      setUserType('student')
    }

    return true
  }, [])

  // Initialize auth and listen for changes
  useEffect(() => {
    let mounted = true

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return

      if (initialSession?.user) {
        setSession(initialSession)
        setUser(initialSession.user)

        // Defer data loading to next microtask.
        // Supabase's onAuthStateChange listener can fire synchronously during
        // getSession(), causing a deadlock if we issue new Supabase queries
        // inside the same call stack. queueMicrotask breaks the call stack
        // while running before the next paint (unlike setTimeout).
        queueMicrotask(async () => {
          if (!mounted) return
          try {
            await loadUserData(initialSession.user.id)
          } catch (error) {
            logger.error('Error loading user data:', error)
          } finally {
            if (mounted) {
              setIsLoading(false)
              setIsInitialized(true)
            }
          }
        })
      } else {
        setIsLoading(false)
        setIsInitialized(true)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return

        // Handle token refresh without re-loading user data
        if (event === 'TOKEN_REFRESHED') {
          setSession(newSession)
          return
        }

        if (event === 'SIGNED_OUT' || !newSession) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setUserType(null)
          setOrganizations([])
          setCurrentOrganization(null)
          setUserRole(null)
          localStorage.removeItem('currentOrganizationId')
          return
        }

        if (event === 'SIGNED_IN' && newSession?.user) {
          // Check if this is the same user (window focus) vs a new user (actual login)
          const isSameUser = userRef.current?.id === newSession.user.id

          setSession(newSession)
          setUser(newSession.user)

          // Only reload user data if this is a NEW user (actual login), not window focus
          if (!isSameUser) {
            // Defer to next microtask to avoid Supabase client deadlock
            // (see comment in getSession handler above)
            queueMicrotask(async () => {
              if (!mounted) return
              setIsLoading(true)
              try {
                await loadUserData(newSession.user.id)
              } catch (error) {
                logger.error('Error loading user data:', error)
              } finally {
                if (mounted) setIsLoading(false)
              }
            })
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadUserData])

  // Refresh organizations
  const refreshOrganizations = useCallback(async () => {
    if (!userRef.current) return

    const { organizations: orgs, memberships } = await fetchOrganizationsData(userRef.current.id)
    setOrganizations(orgs)

    if (currentOrgRef.current) {
      // Update currentOrganization with fresh data (e.g. after Stripe onboarding)
      const freshOrg = orgs.find((o) => o.id === currentOrgRef.current?.id)
      if (freshOrg) {
        setCurrentOrganization(freshOrg)
      }
      const membership = memberships.find((m) => m.organization?.id === currentOrgRef.current?.id)
      setUserRole(membership?.role || null)
    }
  }, [])

  // Sign up
  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    })
    return { error: error as Error | null }
  }, [])

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }, [])

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error as Error | null }
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    // Clear state first
    setUser(null)
    setProfile(null)
    setSession(null)
    setUserType(null)
    setOrganizations([])
    setCurrentOrganization(null)
    setUserRole(null)
    localStorage.removeItem('currentOrganizationId')

    await supabase.auth.signOut()
  }, [])

  // Ensure organization exists (idempotent — safe to call multiple times)
  // No userRef guard — the RPC uses auth.uid() server-side, and the Supabase
  // client has the session JWT immediately after signUp(), even before React
  // state (userRef) is updated via onAuthStateChange.
  const ensureOrganization = useCallback(async (name: string, slug: string) => {
    // Call hardened RPC — no user_id param, uses auth.uid() server-side
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string, args: Record<string, string>
    ) => ReturnType<typeof supabase.rpc>)('ensure_organization_for_user', {
      p_org_name: name,
      p_org_slug: slug,
    })

    if (error) {
      return { organization: null, error: error as Error }
    }

    // RPC returns TABLE rows as array
    const rows = data as Array<{
      org_id: string
      org_slug: string
      org_name: string
      member_role: OrgMemberRole
      was_created: boolean
    }>

    if (!rows || rows.length === 0) {
      return { organization: null, error: new Error('No organization returned') }
    }

    const row = rows[0]

    // Build Organization object from RPC response
    // Fields not returned by RPC get safe defaults — full data loads on next refresh
    const org: Organization = {
      id: row.org_id,
      slug: row.org_slug,
      name: row.org_name,
      description: null,
      logo_url: null,
      email: null,
      phone: null,
      address: null,
      city: null,
      postal_code: null,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      fiken_company_slug: null,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setOrganizations((prev) => {
      // Avoid duplicates if org already existed
      if (prev.some((o) => o.id === org.id)) return prev
      return [...prev, org]
    })
    setCurrentOrganization(org)
    setUserRole(row.member_role)
    setUserType('teacher')
    localStorage.setItem('currentOrganizationId', org.id)

    return { organization: org, error: null }
  }, [])

  // Switch organization
  const switchOrganization = useCallback((organizationId: string) => {
    const org = organizationsRef.current.find((o) => o.id === organizationId)
    if (org && userRef.current?.id) {
      setCurrentOrganization(org)
      localStorage.setItem('currentOrganizationId', org.id)

      supabase
        .from('org_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', userRef.current.id)
        .single()
        .then(({ data, error: roleError }) => {
          if (roleError) {
            logger.error('Error fetching org member role:', roleError)
            setUserRole(null)
            return
          }
          const memberData = data as { role: OrgMemberRole } | null
          setUserRole(memberData?.role || null)
        })
    }
  }, [])

  // Stable organizations key to prevent unnecessary re-renders
  const organizationsKey = useMemo(
    () => organizations.map(o => o.id).sort().join(','),
    [organizations]
  );

  const value = useMemo<AuthContextType>(() => ({
    user,
    profile,
    session,
    isLoading,
    isInitialized,
    userType,
    currentOrganization,
    organizations,
    userRole,
    signUp,
    signIn,
    signOut,
    resetPassword,
    ensureOrganization,
    switchOrganization,
    refreshOrganizations
  }), [
    user?.id,
    profile?.id,
    session?.access_token,
    isLoading,
    isInitialized,
    userType,
    currentOrganization?.id,
    organizationsKey,
    userRole,
    signUp,
    signIn,
    signOut,
    resetPassword,
    ensureOrganization,
    switchOrganization,
    refreshOrganizations
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
