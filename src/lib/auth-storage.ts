import type { SupportedStorage } from '@supabase/supabase-js'

const PKCE_VERIFIER_KEY_SUFFIX = '-code-verifier'

function isPkceVerifierKey(key: string): boolean {
  return key.endsWith(PKCE_VERIFIER_KEY_SUFFIX)
}

/**
 * Keeps Supabase sessions persistent while giving each tab ownership of the
 * PKCE verifier it created.
 *
 * Supabase stores both values through one adapter and removes the verifier
 * whenever it removes a session. With localStorage alone, a stale background
 * tab can therefore delete another tab's in-flight OAuth verifier. The shared
 * mirror remains for email links opened in a new tab; reads adopt that value
 * into the new tab before Supabase consumes it.
 */
export function createAuthStorage(
  persistentStorage: Storage,
  tabStorage: Storage,
): SupportedStorage {
  return {
    getItem(key: string): string | null {
      if (!isPkceVerifierKey(key)) return persistentStorage.getItem(key)

      try {
        const ownedValue = tabStorage.getItem(key)
        if (ownedValue !== null) return ownedValue
      } catch {
        // sessionStorage can be blocked independently; localStorage remains
        // the compatible fallback used by Supabase's default browser client.
      }

      const sharedValue = persistentStorage.getItem(key)
      if (sharedValue !== null) {
        try {
          // Taking a copy gives this tab ownership, allowing the later
          // removeItem call to clean up the matching shared mirror safely.
          tabStorage.setItem(key, sharedValue)
        } catch {
          // The exchange can still proceed from the persistent copy.
        }
      }
      return sharedValue
    },

    setItem(key: string, value: string): void {
      if (!isPkceVerifierKey(key)) {
        persistentStorage.setItem(key, value)
        return
      }

      try {
        tabStorage.setItem(key, value)
      } catch {
        // Preserve Supabase's default localStorage behavior as a fallback.
      }
      persistentStorage.setItem(key, value)
    },

    removeItem(key: string): void {
      if (!isPkceVerifierKey(key)) {
        persistentStorage.removeItem(key)
        return
      }

      let ownedValue: string | null
      try {
        ownedValue = tabStorage.getItem(key)
        if (ownedValue === null) return
        tabStorage.removeItem(key)
      } catch {
        // Without tab ownership we cannot safely delete a verifier shared by
        // another in-flight flow.
        return
      }

      if (persistentStorage.getItem(key) === ownedValue) {
        persistentStorage.removeItem(key)
      }
    },
  }
}
