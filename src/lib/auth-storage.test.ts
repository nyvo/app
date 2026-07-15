import { createAuthStorage } from './auth-storage'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

const VERIFIER_KEY = 'sb-project-auth-token-code-verifier'
const SESSION_KEY = 'sb-project-auth-token'

describe('createAuthStorage', () => {
  it('keeps ordinary auth state in persistent storage', () => {
    const persistent = new MemoryStorage()
    const tab = new MemoryStorage()
    const storage = createAuthStorage(persistent, tab)

    storage.setItem(SESSION_KEY, 'session')

    expect(persistent.getItem(SESSION_KEY)).toBe('session')
    expect(tab.getItem(SESSION_KEY)).toBeNull()
    expect(storage.getItem(SESSION_KEY)).toBe('session')

    storage.removeItem(SESSION_KEY)
    expect(persistent.getItem(SESSION_KEY)).toBeNull()
  })

  it('mirrors the PKCE verifier into the initiating tab', () => {
    const persistent = new MemoryStorage()
    const tab = new MemoryStorage()
    const storage = createAuthStorage(persistent, tab)

    storage.setItem(VERIFIER_KEY, 'verifier-a')

    expect(persistent.getItem(VERIFIER_KEY)).toBe('verifier-a')
    expect(tab.getItem(VERIFIER_KEY)).toBe('verifier-a')
    expect(storage.getItem(VERIFIER_KEY)).toBe('verifier-a')
  })

  it('does not let a background tab remove another tab\'s verifier', () => {
    const persistent = new MemoryStorage()
    const loginTab = new MemoryStorage()
    const staleTab = new MemoryStorage()
    const loginStorage = createAuthStorage(persistent, loginTab)
    const staleStorage = createAuthStorage(persistent, staleTab)
    loginStorage.setItem(VERIFIER_KEY, 'active-verifier')

    staleStorage.removeItem(VERIFIER_KEY)

    expect(persistent.getItem(VERIFIER_KEY)).toBe('active-verifier')
    expect(loginStorage.getItem(VERIFIER_KEY)).toBe('active-verifier')
  })

  it('removes a verifier when the current tab owns the shared value', () => {
    const persistent = new MemoryStorage()
    const tab = new MemoryStorage()
    const storage = createAuthStorage(persistent, tab)
    storage.setItem(VERIFIER_KEY, 'owned-verifier')

    storage.removeItem(VERIFIER_KEY)

    expect(tab.getItem(VERIFIER_KEY)).toBeNull()
    expect(persistent.getItem(VERIFIER_KEY)).toBeNull()
  })

  it('does not let an older flow remove a newer shared verifier', () => {
    const persistent = new MemoryStorage()
    const firstTab = new MemoryStorage()
    const secondTab = new MemoryStorage()
    const firstStorage = createAuthStorage(persistent, firstTab)
    const secondStorage = createAuthStorage(persistent, secondTab)
    firstStorage.setItem(VERIFIER_KEY, 'verifier-a')
    secondStorage.setItem(VERIFIER_KEY, 'verifier-b')

    firstStorage.removeItem(VERIFIER_KEY)

    expect(firstTab.getItem(VERIFIER_KEY)).toBeNull()
    expect(persistent.getItem(VERIFIER_KEY)).toBe('verifier-b')
    expect(secondStorage.getItem(VERIFIER_KEY)).toBe('verifier-b')
  })

  it('adopts a shared verifier when an emailed link opens in a new tab', () => {
    const persistent = new MemoryStorage()
    const originalTab = new MemoryStorage()
    createAuthStorage(persistent, originalTab).setItem(VERIFIER_KEY, 'email-verifier')

    const linkTab = new MemoryStorage()
    const linkStorage = createAuthStorage(persistent, linkTab)

    expect(linkStorage.getItem(VERIFIER_KEY)).toBe('email-verifier')
    expect(linkTab.getItem(VERIFIER_KEY)).toBe('email-verifier')

    linkStorage.removeItem(VERIFIER_KEY)
    expect(persistent.getItem(VERIFIER_KEY)).toBeNull()
  })
})
