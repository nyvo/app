import { describe, it, expect, vi, beforeEach } from 'vitest'

// We'll test the service functions with mocked Supabase
// The supabase mock is set up in src/test/setup.ts

describe('messages service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('archiveConversation', () => {
    it('should call update with archived = true', async () => {
      // Import the mocked supabase
      const { supabase } = await import('@/lib/supabase')
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      })
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never)

      // Import the function under test
      const { archiveConversation } = await import('@/services/messages')

      const result = await archiveConversation('conv-123', true)

      expect(supabase.from).toHaveBeenCalledWith('conversations')
      expect(mockUpdate).toHaveBeenCalledWith({ archived: true, is_read: true })
      expect(result.error).toBeNull()
    })

    it('should call update with archived = false to unarchive', async () => {
      const { supabase } = await import('@/lib/supabase')
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      })
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never)

      const { archiveConversation } = await import('@/services/messages')

      const result = await archiveConversation('conv-123', false)

      expect(mockUpdate).toHaveBeenCalledWith({ archived: false, is_read: true })
      expect(result.error).toBeNull()
    })
  })
})
