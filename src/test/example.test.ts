import { describe, it, expect } from 'vitest'

describe('Basic test setup', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle arrays', () => {
    const items = [1, 2, 3]
    expect(items).toHaveLength(3)
    expect(items).toContain(2)
  })

  it('should handle objects', () => {
    const user = { name: 'Test', email: 'test@example.com' }
    expect(user).toHaveProperty('name', 'Test')
    expect(user.email).toMatch(/@example\.com$/)
  })
})
