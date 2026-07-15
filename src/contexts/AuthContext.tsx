import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Seller, SellerMemberRole, UserRole } from '@/types/database'
import { logger } from '@/lib/logger'
import { isTransientAuthError } from '@/lib/auth-errors'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { fetchSellerOperational } from '@/services/sellers'
import { claimMySignups } from '@/services/signups'

// Type for seller membership with seller data
interface SellerMembership {
  role: SellerMemberRole
  seller: Seller
}

export interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isInitialized: boolean // true once initial auth check is complete

  currentSeller: Seller | null
  sellers: Seller[]
  userRole: SellerMemberRole | null
  // True when the seller_members fetch FAILED (network/5xx) — as opposed to
  // "loaded, zero memberships". Role guards must not demote a seller to buyer
  // on a failed fetch.
  sellersLoadFailed: boolean
  // True when get_seller_operational FAILED while hydrating the current seller,
  // leaving it on the safe public-column defaults (subscription_plan 'free',
  // operating_model 'solo', stripe_account_id null). Consumers that gate on
  // those fields can distinguish "known free/solo" from "unknown, hydrate
  // failed". Cleared once a later hydrate/refresh succeeds.
  currentSellerHydrateFailed: boolean

  // Auth methods
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  sendMagicLink: (
    email: string,
    redirectTo?: string,
    opts?: { shouldCreateUser?: boolean },
  ) => Promise<{ error: Error | null }>
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithPassword: (
    email: string,
    password: string,
    redirectTo?: string,
  ) => Promise<{ error: Error | null; needsConfirmation: boolean }>
  setPassword: (password: string) => Promise<{ error: Error | null }>
  checkEmailAuthStatus: (
    email: string,
  ) => Promise<{ exists: boolean; hasPassword: boolean; error: Error | null }>

  // Seller methods
  ensureSeller: (name: string, slug: string, operatingModel?: string) => Promise<{ seller: Seller | null; error: Error | null }>
  switchSeller: (sellerId: string) => void
  refreshSellers: () => Promise<void>

  // Onboarding methods
  setRole: (role: UserRole | null) => Promise<{ error: Error | null }>
  completeBuyerOnboarding: (input: { name: string; phone?: string }) => Promise<{ error: Error | null }>
  markOnboardingComplete: () => Promise<{ error: Error | null }>
}

// Exported ONLY so /dev previews can inject a staged value (see
// pages/dev/LandingShotPreview). App code must consume via useAuth().
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

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

async function fetchSellersData(userId: string): Promise<{ sellers: Seller[], memberships: SellerMembership[], failed: boolean }> {
  // Explicit column list — only the public grant set is selected here.
  // Operational fields (operating_model, updated_at) are hydrated separately via
  // get_seller_operational for the active seller.
  // Sensitive fields (phone, organization_number) remain gated behind
  // get_seller_private.
  const { data: memberships, error: memberError } = await supabase
    .from('seller_members')
    .select(`
      role,
      seller:sellers(
        id,
        name,
        logo_url,
        slug,
        cover_image_url,
        default_course_image_url,
        created_at,
        stripe_onboarding_complete,
        student_discount_percent,
        senior_discount_percent
      )
    `)
    .eq('user_id', userId)

  if (memberError) {
    logger.error('Error fetching seller memberships:', memberError)
    // failed=true: "we don't know", NOT "no memberships" — consumers must not
    // treat this as an authoritative buyer verdict.
    return { sellers: [], memberships: [], failed: true }
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
      slug: (s.slug ?? '') as string,
      cover_image_url: (s.cover_image_url ?? null) as string | null,
      default_course_image_url: (s.default_course_image_url ?? null) as string | null,
      closed_at: null,
      email: null,
      stripe_account_id: null,
      stripe_account_status: null,
      stripe_onboarding_complete: (s.stripe_onboarding_complete ?? false) as boolean,
      stripe_payouts_enabled: false,
      student_discount_percent: (s.student_discount_percent ?? null) as number | null,
      senior_discount_percent: (s.senior_discount_percent ?? null) as number | null,
      operating_model: 'solo',
      organization_number: null,
      subscription_plan: 'free',
      subscription_status: 'none',
      subscription_current_period_end: null,
      subscription_cancel_at_period_end: false,
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

  return { sellers, memberships: typedMemberships, failed: false }
}

// Hydrate operational fields (operating_model, subscription plan/status, updated_at)
// for a single seller via the member-gated RPC. Returns the seller unchanged on
// RPC failure or non-member access — UI degrades to the public columns only.
// `failed` is true ONLY on a genuine RPC error (network/5xx); a null result
// (non-member) is a valid empty answer, not a failure.
async function hydrateSellerOperational(
  seller: Seller,
): Promise<{ seller: Seller; failed: boolean }> {
  const { data, error } = await fetchSellerOperational(seller.id)
  if (error) {
    logger.error('Error hydrating seller operational fields:', error)
    return { seller, failed: true }
  }
  if (!data) return { seller, failed: false }
  return {
    seller: {
      ...seller,
      stripe_account_id: data.stripe_account_id,
      stripe_account_status: data.stripe_account_status,
      stripe_onboarding_complete: data.stripe_onboarding_complete,
      stripe_payouts_enabled: data.stripe_payouts_enabled,
      operating_model: data.operating_model,
      subscription_plan: data.subscription_plan,
      subscription_status: data.subscription_status,
      subscription_current_period_end: data.subscription_current_period_end,
      subscription_customer_id: data.subscription_customer_id ?? seller.subscription_customer_id,
      uses_integrated_payments: data.uses_integrated_payments,
      updated_at: data.updated_at,
    },
    failed: false,
  }
}


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  const [currentSeller, setCurrentSeller] = useState<Seller | null>(null)
  const [sellers, setSellers] = useState<Seller[]>([])
  const [userRole, setUserRole] = useState<SellerMemberRole | null>(null)
  const [sellersLoadFailed, setSellersLoadFailed] = useState(false)
  const [currentSellerHydrateFailed, setCurrentSellerHydrateFailed] = useState(false)

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
    // Verify user still exists server-side (getSession only reads cached JWT).
    // A transient network/5xx failure here must NOT destroy a valid session —
    // only a definitive verdict (deleted user, revoked/absent session) signs
    // out. On a transient error we keep the session and proceed with the cached
    // user; a downstream profile-fetch failure is surfaced by the route guards.
    // All automatic cleanups here use scope 'local': the default 'global'
    // revokes every session the user has, so a tab booting with a stale
    // session would kill the fresh session just created in another tab —
    // leaving that tab rendering (JWT still signature-valid for RLS) while
    // every edge function 401s on its session_not_found getUser check.
    const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      if (!isTransientAuthError(userError)) {
        logger.error('User no longer exists server-side, signing out')
        await supabase.auth.signOut({ scope: 'local' })
        return false
      }
      logger.warn('getUser failed transiently; keeping session and using cached user', userError)
    } else if (!verifiedUser) {
      // Succeeded with no user — the session is genuinely invalid.
      logger.error('User no longer exists server-side, signing out')
      await supabase.auth.signOut({ scope: 'local' })
      return false
    }

    let userProfile = await fetchProfileData(userId)
    if (!userProfile) {
      // Self-heal a missing profile instead of signing out. The row can be absent
      // if the handle_new_user trigger ever failed (it swallows errors) or the row
      // was deleted — and a profile-less session would otherwise hang the auth flow
      // forever (this path → signOut on every login). RLS "Profiles INSERT own"
      // lets the user create their own row.
      logger.warn('Profile missing for authenticated user; self-healing')
      // ensure_own_profile is a SECURITY DEFINER RPC that (re)creates the caller's
      // own profile row idempotently — profiles is SELECT-only for the client, so
      // creation goes through the definer function, not a direct insert.
      const { error: healError } = await supabase.rpc('ensure_own_profile')
      if (healError) {
        logger.error('Failed to self-heal missing profile, signing out:', healError)
        await supabase.auth.signOut({ scope: 'local' })
        return false
      }
      userProfile = await fetchProfileData(userId)
      if (!userProfile) {
        logger.error('Profile still missing after self-heal, signing out')
        await supabase.auth.signOut({ scope: 'local' })
        return false
      }
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

    const { sellers: loadedSellers, memberships, failed } = await fetchSellersData(userId)
    setSellersLoadFailed(failed)
    setSellers(loadedSellers)

    if (loadedSellers.length > 0 && !currentSellerRef.current) {
      const savedSellerId = getStoredCurrentSellerId(userId)
      const savedSeller = loadedSellers.find((s) => s.id === savedSellerId)
      const sellerToSet = savedSeller || loadedSellers[0]

      const { seller: hydrated, failed: hydrateFailed } = await hydrateSellerOperational(sellerToSet)
      setCurrentSeller(hydrated)
      setCurrentSellerHydrateFailed(hydrateFailed)
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
    }).catch((err) => {
      // getSession can reject (corrupted persisted token, storage access
      // failure). Without this catch isInitialized never flips and every
      // guard renders null forever — a permanent blank page. Fall back to
      // the unauthenticated state instead.
      logger.error('getSession failed during init:', err)
      if (!mounted) return
      setIsLoading(false)
      setIsInitialized(true)
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
          setUserRole(null)
          setSellersLoadFailed(false)
          setCurrentSellerHydrateFailed(false)
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
    const [profileData, { sellers: loadedSellers, memberships, failed }] = await Promise.all([
      fetchProfileData(userRef.current.id),
      fetchSellersData(userRef.current.id),
    ])

    if (profileData) {
      setProfile(profileData)
    }

    setSellersLoadFailed(failed)
    // On a failed refresh keep the last-known sellers instead of clobbering a
    // working seller session with [] (which would demote the UI to buyer).
    if (failed) return

    setSellers(loadedSellers)

    if (currentSellerRef.current) {
      // Update currentSeller with fresh data (e.g. after Stripe onboarding).
      // Hydrate operational fields via the member-gated RPC so consumers
      // (PaymentsPage, AffiliationsSection) see fresh operating_model.
      const freshSeller = loadedSellers.find((s) => s.id === currentSellerRef.current?.id)
      if (freshSeller) {
        const { seller: hydrated, failed: hydrateFailed } = await hydrateSellerOperational(freshSeller)
        setCurrentSeller(hydrated)
        setCurrentSellerHydrateFailed(hydrateFailed)
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

  // Magic link / OTP — emails a one-click link + 6-digit code (no password
  // needed). `shouldCreateUser` defaults to true (sign-in-or-create); pass false
  // for login-only paths so an unknown email can't silently create an account.
  const sendMagicLink = useCallback(
    async (email: string, redirectTo?: string, opts?: { shouldCreateUser?: boolean }) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo || `${window.location.origin}${AUTH_ROUTES.callback}`,
          shouldCreateUser: opts?.shouldCreateUser ?? true,
        },
      })
      return { error: error as Error | null }
    },
    [],
  )

  // Email + password sign-in (combined auth screen). Returns a generic error on
  // bad credentials — Supabase obfuscates "wrong password" vs "no such user".
  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }, [])

  // Email + password sign-up. `needsConfirmation` is true when email confirmation
  // is enabled and no session came back — the caller then routes to the OTP screen
  // (verifyOtp type 'signup') to finish.
  const signUpWithPassword = useCallback(
    async (email: string, password: string, redirectTo?: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo || `${window.location.origin}${AUTH_ROUTES.callback}`,
        },
      })
      return { error: error as Error | null, needsConfirmation: !data.session }
    },
    [],
  )

  // Set/replace the password on the currently-authenticated user. Bridges a
  // passwordless (Google / magic-link) account into one that can use a password.
  // Note (supabase/auth#2085): this enables password login but does not add an
  // 'email' row to auth.identities — password login still works regardless.
  const setPassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error as Error | null }
  }, [])

  // Server-side existence check for the combined auth screen — there is no client
  // API for this by design. SECURITY DEFINER RPC (20260630140000). Returns exists
  // + has_password so the page can branch: sign in / sign up / code-bridge.
  const checkEmailAuthStatus = useCallback(async (email: string) => {
    const { data, error } = await supabase.rpc('check_email_auth_status', { p_email: email })
    if (error) return { exists: false, hasPassword: false, error: error as Error }
    const row = (data as Array<{ email_exists: boolean; has_password: boolean }> | null)?.[0]
    return { exists: !!row?.email_exists, hasPassword: !!row?.has_password, error: null }
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
    setUserRole(null)
    clearStoredCurrentSellerId(signingOutUserId)

    await supabase.auth.signOut()
  }, [])

  // Ensure seller exists (idempotent — safe to call multiple times)
  // No userRef guard — the RPC uses auth.uid() server-side, and the Supabase
  // client has the session JWT immediately after signUp(), even before React
  // state (userRef) is updated via onAuthStateChange.
  const ensureSeller = useCallback(async (name: string, slug: string, operatingModel: string = 'solo') => {
    // Call hardened RPC — no user_id param, uses auth.uid() server-side
    const { data, error } = await supabase.rpc('ensure_seller_for_user', {
      p_seller_name: name,
      p_slug: slug,
      p_operating_model: operatingModel,
    })

    if (error) {
      return { seller: null, error: error as Error }
    }

    // RPC returns TABLE rows as array
    const rows = data as Array<{
      seller_id: string
      slug: string
      seller_name: string
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
      slug: row.slug,
      cover_image_url: null,
      default_course_image_url: null,
      closed_at: null,
      email: null,
      stripe_account_id: null,
      stripe_account_status: null,
      stripe_onboarding_complete: false,
      stripe_payouts_enabled: false,
      student_discount_percent: null,
      senior_discount_percent: null,
      operating_model: operatingModel,
      organization_number: null,
      subscription_plan: 'free',
      subscription_status: 'none',
      subscription_current_period_end: null,
      subscription_cancel_at_period_end: false,
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
    // Freshly created from the RPC response — the safe defaults are correct
    // here, not a stale-hydrate fallback, so clear any prior failure flag.
    setCurrentSellerHydrateFailed(false)
    // The creator is the seller's owner (the RPC no longer echoes the role).
    setUserRole('owner')
    if (userRef.current?.id) setStoredCurrentSellerId(userRef.current.id, seller.id)

    return { seller, error: null }
  }, [])

  // Onboarding — write the role the user picked in the RoleChooser step.
  // No auto-side-effects: a buyer doesn't get a seller stub here, a seller
  // doesn't get a team here. Those happen later in their respective forms.
  const setRole = useCallback(async (role: UserRole | null) => {
    const userId = userRef.current?.id
    if (!userId) return { error: new Error('Ikke logget inn') }
    const { data, error } = await supabase.rpc('set_user_role', {
      // p_role is nullable at the SQL level (null = back to the role chooser);
      // generated types can't express nullable RPC params.
      p_role: role as unknown as string,
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
    const { data, error } = await supabase.rpc('complete_buyer_onboarding', {
      p_name: input.name.trim(),
      // Omit rather than send null — the RPC's param default is NULL anyway.
      p_phone: input.phone?.trim() || undefined,
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
    const { data, error } = await supabase.rpc('mark_seller_onboarding_complete')
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
      void hydrateSellerOperational(seller).then(({ seller: hydrated, failed }) => {
        setCurrentSeller((prev) => (prev?.id === hydrated.id ? hydrated : prev))
        setCurrentSellerHydrateFailed(failed)
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

  const value = useMemo<AuthContextType>(() => ({
    user,
    profile,
    session,
    isLoading,
    isInitialized,
    currentSeller,
    sellers,
    userRole,
    sellersLoadFailed,
    currentSellerHydrateFailed,
    signInWithGoogle,
    signOut,
    sendMagicLink,
    signInWithPassword,
    signUpWithPassword,
    setPassword,
    checkEmailAuthStatus,
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
    sellersKey,
    userRole,
    sellersLoadFailed,
    currentSellerHydrateFailed,
    signInWithGoogle,
    signOut,
    sendMagicLink,
    signInWithPassword,
    signUpWithPassword,
    setPassword,
    checkEmailAuthStatus,
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
