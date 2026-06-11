import '@testing-library/jest-dom'

// jsdom has no matchMedia; src/lib/motion.ts queries prefers-reduced-motion
// at module scope, so any component test touching motion needs this stub.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as typeof window.matchMedia

// Mock Supabase client for tests
const mockQueryBuilder = () => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(mockQueryBuilder),
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  },
  typedFrom: vi.fn(mockQueryBuilder),
}))
