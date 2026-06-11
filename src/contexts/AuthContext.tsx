import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Seller, SellerMemberRole, Team, UserRole } from '@/types/database'
import { logger } from '@/lib/logger'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { fetchSellerOperational } from '@/services/sellers'
import { claimMySignups } from '@/services/signups'

// Type for seller membership with seller data
interface SellerMembership {
  role: SellerMemberRole
  seller: Seller
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isInitialized: boolean // true once initial auth check is complete

  currentSeller: Seller | null
  currentTeam: Team | null   // The team owned by currentSeller (1:1 in current model)
  sellers: Seller[]
  userRole: SellerMemberRole | null

  // Auth methods
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  sendMagicLink: (email: string, redirectTo?: string) => Promise<{ error: Error | null }>

  // Seller methods
  ensureSeller: (name: string, slug: string, sellerType?: string) => Promise<{ seller: Seller | null; error: Error | null }>
  switchSeller: (sellerId: string) => void
  refreshSellers: () => Promise<void>

  // Onboarding methods
  setRole: (role: UserRole | null) => Promise<{ error: Error | null }>
  completeBuyerOnboarding: (input: { name: string; phone?: string }) => Promise<{ error: Error | null }>
  markOnboardingComplete: () => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const LEGACY_CURRENT_SELLER_KEY = 'currentSellerId'

function currentSellerStorageKey(userId: string): string {
  return `currentSellerId:${userId}`
}

function getStoredCurrentSellerId(userId: string): string | null {
  return localStorage.getItem(currentSellerStorageKey(userId)) ?? localStorage.getItem(LEGACY_CURRENT_SELLER_KEY)
}

function setStoredCurrentSellerId(userId: string, sellerId: string): void {
  localStorage.setItem(currentSellerStorageKey(userId), sellerId)
  localStorage.removeItem(LEGACY_CURRENT_SELLER_KEY)
}

function clearStoredCurrentSellerId(userId?: string): void {
  if (userId) localStorage.removeItem(currentSellerStorageKey(userId))
  localStorage.removeItem(LEGACY_CURRENT_SELLER_KEY)
}

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

async function fetchSellersData(userId: string): Promise<{ sellers: Seller[], memberships: SellerMembership[] }> {
  // Explicit column list — only the public grant set is selected here.
  // Operational fields (dintero_seller_id, dintero_onboarding_status,
  // seller_type, updated_at) are hydrated separately via
  // get_seller_operational for the active seller.
  // Sensitive fields (dintero_approval_id, dintero_contract_url, phone,
  // organization_number) remain gated behind get_seller_private.
  const { data: memberships, error: memberError } = await supabase
    .from('seller_members')
    .select(`
      role,
      seller:sellers(
        id,
        name,
        logo_url,
        created_at,
        dintero_onboarding_complete
      )
    `)
    .eq('user_id', userId)

  if (memberError) {
    logger.error('Error fetching seller memberships:', memberError)
    return { sellers: [], memberships: [] }
  }

  // The embedded select returns only the public columns; the Seller type
  // expects the operational/sensitive fields too. Fill the gaps with safe
  // defaults — hydrateSellerOperational replaces them for the active seller.
  const typedMemberships = (memberships || []).map((m) => {
    const s = (m as { role: SellerMemberRole; seller: Partial<Seller> | null }).seller
    if (!s) return { role: (m as { role: SellerMemberRole }).role, seller: null as unknown as Seller }
    const seller: Seller = {
      id: s.id as string,
      name: s.name as string,
      logo_url: (s.logo_url ?? null) as string | null,
      closed_at: null,
      email: null,
      phone: null,
      dintero_seller_id: null,
      dintero_approval_id: null,
      dintero_contract_url: null,
      dintero_onboarding_status: null,
      dintero_onboarding_complete: (s.dintero_onboarding_complete ?? false) as boolean,
      settings: {},
      seller_type: 'individual',
      organization_number: null,
      subscription_plan: 'free',
      subscription_status: 'none',
      subscription_current_period_end: null,
      subscription_provider: null,
      subscription_customer_id: null,
      subscription_external_id: null,
      uses_integrated_payments: false,
      created_at: (s.created_at ?? null) as string | null,
      updated_at: (s.created_at ?? null) as string | null,
    }
    return { role: (m as { role: SellerMemberRole }).role, seller }
  }) as SellerMembership[]
  const sellers = typedMemberships.map((m) => m.seller).filter(Boolean)

  return { sellers, memberships: typedMemberships }
}

// Hydrate operational fields (Dintero IDs, onboarding status, seller_type,
// subscription plan/status, updated_at) for a single seller via the
// member-gated RPC. Returns the seller unchanged on RPC failure or
// non-member access — UI degrades to the public columns only.
async function hydrateSellerOperational(seller: Seller): Promise<Seller> {
  const { data, error } = await fetchSellerOperational(seller.id)
  if (error) {
    logger.error('Error hydrating seller operational fields:', error)
    return seller
  }
  if (!data) return seller
  return {
    ...seller,
    dintero_seller_id: data.dintero_seller_id,
    dintero_onboarding_status: data.dintero_onboarding_status,
    seller_type: data.seller_type,
    subscription_plan: data.subscription_plan,
    subscription_status: data.subscription_status,
    subscription_current_period_end: data.subscription_current_period_end,
    subscription_customer_id: data.subscription_customer_id ?? seller.subscription_customer_id,
    uses_integrated_payments: data.uses_integrated_payments,
    updated_at: data.updated_at,
  }
}

// Fetch teams owned by the given sellers. One row per seller (1:1 ownership).
async function fetchTeamsForSellers(sellerIds: string[]): Promise<Team[]> {
  if (sellerIds.length === 0) return []
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .in('owner_seller_id', sellerIds)
  if (error) {
    logger.error('Error fetching teams:', error)
    return []
  }
  return (data as Team[]) || []
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  const [currentSeller, setCurrentSeller] = useState<Seller | null>(null)
  const [sellers, setSellers] = useState<Seller[]>([])
  const [teamsBySellerId, setTeamsBySellerId] = useState<Record<string, Team>>({})
  const [userRole, setUserRole] = useState<SellerMemberRole | null>(null)

  // Refs to track values without causing re-renders in callbacks
  const currentSellerRef = useRef<Seller | null>(null)
  currentSellerRef.current = currentSeller

  const userRef = useRef<User | null>(null)
  userRef.current = user

  const sellersRef = useRef<Seller[]>([])
  sellersRef.current = sellers

  // Load user data (profile + sellers)
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

    // Claim historical guest bookings by verified-email match. Fire-and-forget
    // at session start — the buyer dashboard re-reads on mount, so a claim
    // that lands after the first render is picked up on the next visit.
    // Failures are swallowed: claiming is a background convenience, never a
    // blocker for login. (Buyer onboarding awaits its own claim before
    // prefill — see BuyerSetup.)
    void claimMySignups().then(({ error }) => {
      if (error) logger.error('claim_my_signups failed (background):', error)
    })

    const { sellers: loadedSellers, memberships } = await fetchSellersData(userId)
    setSellers(loadedSellers)

    const loadedTeams = await fetchTeamsForSellers(loadedSellers.map((s) => s.id))
    const teamMap: Record<string, Team> = {}
    for (const t of loadedTeams) teamMap[t.owner_seller_id] = t
    setTeamsBySellerId(teamMap)

    if (loadedSellers.length > 0 && !currentSellerRef.current) {
      const savedSellerId = getStoredCurrentSellerId(userId)
      const savedSeller = loadedSellers.find((s) => s.id === savedSellerId)
      const sellerToSet = savedSeller || loadedSellers[0]

      const hydrated = await hydrateSellerOperational(sellerToSet)
      setCurrentSeller(hydrated)
      setSellers((prev) => prev.map((s) => (s.id === hydrated.id ? hydrated : s)))
      setStoredCurrentSellerId(userId, hydrated.id)

      const membership = memberships.find((m) => m.seller?.id === hydrated.id)
      setUserRole(membership?.role || null)
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
          const signedOutUserId = userRef.current?.id
          setSession(null)
          setUser(null)
          setProfile(null)
          setSellers([])
          setCurrentSeller(null)
          setTeamsBySellerId({})
          setUserRole(null)
          clearStoredCurrentSellerId(signedOutUserId)
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

  // Refresh sellers
  const refreshSellers = useCallback(async () => {
    if (!userRef.current) return

    // Refresh profile alongside sellers (e.g. after onboarding writes to profiles)
    const [profileData, { sellers: loadedSellers, memberships }] = await Promise.all([
      fetchProfileData(userRef.current.id),
      fetchSellersData(userRef.current.id),
    ])

    if (profileData) {
      setProfile(profileData)
    }

    setSellers(loadedSellers)

    const loadedTeams = await fetchTeamsForSellers(loadedSellers.map((s) => s.id))
    const teamMap: Record<string, Team> = {}
    for (const t of loadedTeams) teamMap[t.owner_seller_id] = t
    setTeamsBySellerId(teamMap)

    if (currentSellerRef.current) {
      // Update currentSeller with fresh data (e.g. after Dintero onboarding).
      // Hydrate operational fields via the member-gated RPC so consumers
      // (PaymentsPage, AffiliationsSection) see fresh dintero status / seller_type.
      const freshSeller = loadedSellers.find((s) => s.id === currentSellerRef.current?.id)
      if (freshSeller) {
        const hydrated = await hydrateSellerOperational(freshSeller)
        setCurrentSeller(hydrated)
        setSellers((prev) => prev.map((s) => (s.id === hydrated.id ? hydrated : s)))
      }
      const membership = memberships.find((m) => m.seller?.id === currentSellerRef.current?.id)
      setUserRole(membership?.role || null)
    }
  }, [])

  // Sign in with Google OAuth
  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || `${window.location.origin}${AUTH_ROUTES.callback}`,
      },
    })
    return { error: error as Error | null }
  }, [])

  // Magic link — sends a one-click login link via email (no password needed)
  const sendMagicLink = useCallback(async (email: string, redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo || `${window.location.origin}${AUTH_ROUTES.callback}`,
      },
    })
    return { error: error as Error | null }
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    const signingOutUserId = userRef.current?.id

    // Clear state first
    setUser(null)
    setProfile(null)
    setSession(null)
    setSellers([])
    setCurrentSeller(null)
    setTeamsBySellerId({})
    setUserRole(null)
    clearStoredCurrentSellerId(signingOutUserId)

    await supabase.auth.signOut()
  }, [])

  // Ensure seller exists (idempotent — safe to call multiple times)
  // No userRef guard — the RPC uses auth.uid() server-side, and the Supabase
  // client has the session JWT immediately after signUp(), even before React
  // state (userRef) is updated via onAuthStateChange.
  const ensureSeller = useCallback(async (name: string, slug: string, sellerType: string = 'individual') => {
    // Call hardened RPC — no user_id param, uses auth.uid() server-side
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string, args: Record<string, string>
    ) => ReturnType<typeof supabase.rpc>)('ensure_seller_for_user', {
      p_seller_name: name,
      p_team_slug: slug,
      p_seller_type: sellerType,
    })

    if (error) {
      return { seller: null, error: error as Error }
    }

    // RPC returns TABLE rows as array
    const rows = data as Array<{
      seller_id: string
      team_id: string
      team_slug: string
      seller_name: string
      member_role: SellerMemberRole
      was_created: boolean
    }>

    if (!rows || rows.length === 0) {
      return { seller: null, error: new Error('Kunne ikke opprette studio. Prøv igjen.') }
    }

    const row = rows[0]

    // Build Seller object from RPC response
    // Fields not returned by RPC get safe defaults — full data loads on next refresh
    const seller: Seller = {
      id: row.seller_id,
      name: row.seller_name,
      logo_url: null,
      closed_at: null,
      email: null,
      phone: null,
      dintero_seller_id: null,
      dintero_approval_id: null,
      dintero_contract_url: null,
      dintero_onboarding_status: null,
      dintero_onboarding_complete: false,
      settings: {},
      seller_type: sellerType,
      organization_number: null,
      subscription_plan: 'free',
      subscription_status: 'none',
      subscription_current_period_end: null,
      subscription_provider: null,
      subscription_customer_id: null,
      subscription_external_id: null,
      uses_integrated_payments: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setSellers((prev) => {
      // Avoid duplicates if seller already existed
      if (prev.some((s) => s.id === seller.id)) return prev
      return [...prev, seller]
    })
    setCurrentSeller(seller)
    setUserRole(row.member_role)
    if (userRef.current?.id) setStoredCurrentSellerId(userRef.current.id, seller.id)

    // Stub a Team entry so consumers (currentTeam) work immediately. Full team
    // data loads on next refreshSellers/loadUserData call.
    const stubTeam: Team = {
      id: row.team_id,
      slug: row.team_slug,
      name: row.seller_name,
      cover_image_url: null,
      default_course_image_url: null,
      owner_seller_id: row.seller_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setTeamsBySellerId((prev) => ({ ...prev, [seller.id]: stubTeam }))

    return { seller, error: null }
  }, [])

  // Onboarding — write the role the user picked in the RoleChooser step.
  // No auto-side-effects: a buyer doesn't get a seller stub here, a seller
  // doesn't get a team here. Those happen later in their respective forms.
  const setRole = useCallback(async (role: UserRole | null) => {
    const userId = userRef.current?.id
    if (!userId) return { error: new Error('Ikke logget inn') }
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string, args: { p_role: UserRole | null }
    ) => ReturnType<typeof supabase.rpc>)('set_user_role', {
      p_role: role,
    })
    if (error) return { error: error as Error }
    const updatedProfile = data as Profile | null
    setProfile((prev) => updatedProfile ?? (prev ? { ...prev, role } : prev))
    return { error: null }
  }, [])

  // Onboarding — buyer finishes the single-form step. Writes name + phone
  // and stamps onboarding_completed_at in one call.
  const completeBuyerOnboarding = useCallback(async (input: { name: string; phone?: string }) => {
    const userId = userRef.current?.id
    if (!userId) return { error: new Error('Ikke logget inn') }
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
      args: { p_name: string; p_phone: string | null }
    ) => ReturnType<typeof supabase.rpc>)('complete_buyer_onboarding', {
      p_name: input.name.trim(),
      p_phone: input.phone?.trim() || null,
    })
    if (error) return { error: error as Error }
    const updatedProfile = data as Profile | null
    setProfile((prev) => updatedProfile ?? prev)
    return { error: null }
  }, [])

  // Onboarding — seller finishes the profile + slug steps. Just stamps
  // onboarding_completed_at (name + slug are persisted via ensureSeller).
  const markOnboardingComplete = useCallback(async () => {
    const userId = userRef.current?.id
    if (!userId) return { error: new Error('Ikke logget inn') }
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
      args?: Record<string, never>
    ) => ReturnType<typeof supabase.rpc>)('mark_seller_onboarding_complete')
    if (error) return { error: error as Error }
    const updatedProfile = data as Profile | null
    setProfile((prev) => updatedProfile ?? prev)
    return { error: null }
  }, [])

  // Switch seller
  const switchSeller = useCallback((sellerId: string) => {
    const seller = sellersRef.current.find((s) => s.id === sellerId)
    if (seller && userRef.current?.id) {
      setCurrentSeller(seller)
      setStoredCurrentSellerId(userRef.current.id, seller.id)

      // Hydrate operational fields for the newly active seller. Fire-and-forget;
      // UI consumers fall back to the public columns until this resolves.
      void hydrateSellerOperational(seller).then((hydrated) => {
        setCurrentSeller((prev) => (prev?.id === hydrated.id ? hydrated : prev))
        setSellers((prev) => prev.map((s) => (s.id === hydrated.id ? hydrated : s)))
      })

      supabase
        .from('seller_members')
        .select('role')
        .eq('seller_id', sellerId)
        .eq('user_id', userRef.current.id)
        .single()
        .then(({ data, error: roleError }) => {
          if (roleError) {
            logger.error('Error fetching seller member role:', roleError)
            setUserRole(null)
            return
          }
          const memberData = data as { role: SellerMemberRole } | null
          setUserRole(memberData?.role || null)
        })
    }
  }, [])

  // Stable sellers key to prevent unnecessary re-renders
  const sellersKey = useMemo(
    () => sellers.map(s => s.id).sort().join(','),
    [sellers]
  );

  const currentTeam = useMemo<Team | null>(
    () => (currentSeller ? teamsBySellerId[currentSeller.id] ?? null : null),
    [currentSeller, teamsBySellerId]
  )

  const value = useMemo<AuthContextType>(() => ({
    user,
    profile,
    session,
    isLoading,
    isInitialized,
    currentSeller,
    currentTeam,
    sellers,
    userRole,
    signInWithGoogle,
    signOut,
    sendMagicLink,
    ensureSeller,
    switchSeller,
    refreshSellers,
    setRole,
    completeBuyerOnboarding,
    markOnboardingComplete,
  }), [
    user?.id,
    profile,
    session?.access_token,
    isLoading,
    isInitialized,
    currentSeller,
    currentTeam,
    sellersKey,
    userRole,
    signInWithGoogle,
    signOut,
    sendMagicLink,
    ensureSeller,
    switchSeller,
    refreshSellers,
    setRole,
    completeBuyerOnboarding,
    markOnboardingComplete,
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
