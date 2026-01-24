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
  createOrganization: (name: string, slug: string) => Promise<{ organization: Organization | null; error: Error | null }>
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
    // If profile doesn't exist (e.g., after password reset), create it
    if (error.code === 'PGRST116') {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newProfile, error: insertError } = await (supabase.from('profiles') as any)
          .insert({
            id: userId,
            email: user.email || '',
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
          })
          .select()
          .single()

        if (insertError) {
          logger.error('Error creating profile:', insertError)
          return null
        }

        return newProfile
      }
    }

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
  const loadUserData = useCallback(async (userId: string) => {
    const userProfile = await fetchProfileData(userId)
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

        // Defer Supabase queries to avoid deadlock
        setTimeout(async () => {
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
        }, 0)
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
            // Defer Supabase queries to avoid deadlock
            setTimeout(async () => {
              if (!mounted) return
              setIsLoading(true)
              try {
                await loadUserData(newSession.user.id)
              } catch (error) {
                logger.error('Error loading user data:', error)
              } finally {
                if (mounted) setIsLoading(false)
              }
            }, 0)
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

  // Create organization
  const createOrganization = useCallback(async (name: string, slug: string) => {
    if (!userRef.current) {
      return { organization: null, error: new Error('Must be logged in') }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('create_organization_for_user', {
      org_name: name,
      org_slug: slug,
      user_id: userRef.current.id
    })

    if (error) {
      return { organization: null, error: error as Error }
    }

    const orgId = data as string

    const { data: orgData, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (fetchError || !orgData) {
      return { organization: null, error: (fetchError as Error) || new Error('Organization not found') }
    }

    const org = orgData as Organization

    setOrganizations((prev) => [...prev, org])
    setCurrentOrganization(org)
    setUserRole('owner')
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
        .then(({ data }) => {
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
    createOrganization,
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
    createOrganization,
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
