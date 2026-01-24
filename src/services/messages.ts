import { supabase } from '@/lib/supabase'
import type { Conversation, ConversationInsert, Message, MessageInsert, Profile } from '@/types/database'

// Conversation with last message and participant info
export interface ConversationWithDetails extends Conversation {
  messages: Message[]
  participant: {
    name: string
    email: string
    avatar_url?: string | null
  } | null
  last_message?: Message | null
  unread_count: number
}

// Message with sender info
export interface MessageWithSender extends Message {
  sender_name?: string
}

// Raw conversation from Supabase with messages join
interface ConversationWithMessages extends Conversation {
  messages: Message[]
}

// Fetch all conversations for an organization
export async function fetchConversations(
  organizationId: string
): Promise<{ data: ConversationWithDetails[] | null; error: Error | null }> {
  // Get conversations with their messages
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      *,
      messages(*)
    `)
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })

  if (error) {
    return { data: null, error: error as Error }
  }

  if (!conversations || conversations.length === 0) {
    return { data: [], error: null }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedConversations = conversations as any as ConversationWithMessages[]

  // Get user profiles for conversations with user_id
  const userIds = typedConversations
    .filter(c => c.user_id)
    .map(c => c.user_id as string)

  let profilesMap: Record<string, Profile> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)

    if (profiles) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const typedProfiles = profiles as any as Profile[]
      profilesMap = typedProfiles.reduce((acc, p) => {
        acc[p.id] = p
        return acc
      }, {} as Record<string, Profile>)
    }
  }

  // Map conversations with details
  const conversationsWithDetails: ConversationWithDetails[] = typedConversations.map(conv => {
    const messages = conv.messages || []
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const lastMessage = sortedMessages[0] || null
    const unreadCount = messages.filter(m => !m.is_read && !m.is_outgoing).length

    // Get participant info from profile or guest_email
    let participant = null
    if (conv.user_id && profilesMap[conv.user_id]) {
      const profile = profilesMap[conv.user_id]
      participant = {
        name: profile.name || profile.email || 'Ukjent',
        email: profile.email || '',
        avatar_url: profile.avatar_url
      }
    } else if (conv.guest_email) {
      participant = {
        name: conv.guest_email,
        email: conv.guest_email,
        avatar_url: null
      }
    }

    return {
      ...conv,
      messages: sortedMessages,
      participant,
      last_message: lastMessage,
      unread_count: unreadCount
    }
  })

  return { data: conversationsWithDetails, error: null }
}

// Fetch messages for a specific conversation
export async function fetchMessages(
  conversationId: string
): Promise<{ data: Message[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error as Error }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { data: data as any as Message[], error: null }
}

// Find or create a conversation with a recipient
export async function findOrCreateConversation(
  organizationId: string,
  recipientEmail: string,
  recipientUserId?: string | null
): Promise<{ data: Conversation | null; error: Error | null }> {
  // First, try to find existing conversation
  let query = supabase
    .from('conversations')
    .select('*')
    .eq('organization_id', organizationId)

  if (recipientUserId) {
    query = query.eq('user_id', recipientUserId)
  } else {
    query = query.eq('guest_email', recipientEmail)
  }

  const { data: existing, error: findError } = await query.maybeSingle()

  if (findError) {
    return { data: null, error: findError as Error }
  }

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { data: existing as any as Conversation, error: null }
  }

  // Create new conversation
  const newConversation: ConversationInsert = {
    organization_id: organizationId,
    user_id: recipientUserId || null,
    guest_email: recipientUserId ? null : recipientEmail,
    is_read: true // Teacher starts conversation, so it's read
  }

  const { data: created, error: createError } = await supabase
    .from('conversations')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(newConversation as any)
    .select()
    .single()

  if (createError) {
    return { data: null, error: createError as Error }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { data: created as any as Conversation, error: null }
}

// Send a message in a conversation
export async function sendMessage(
  conversationId: string,
  content: string,
  isOutgoing: boolean = true
): Promise<{ data: Message | null; error: Error | null }> {
  const newMessage: MessageInsert = {
    conversation_id: conversationId,
    content,
    is_outgoing: isOutgoing,
    is_read: isOutgoing // Outgoing messages are "read" by sender
  }

  const { data, error } = await supabase
    .from('messages')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(newMessage as any)
    .select()
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  // Update conversation's updated_at timestamp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('conversations') as any)
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { data: data as any as Message, error: null }
}

// Mark a conversation as read
export async function markConversationRead(
  conversationId: string
): Promise<{ error: Error | null }> {
  // Mark conversation as read
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: convError } = await (supabase.from('conversations') as any)
    .update({ is_read: true })
    .eq('id', conversationId)

  if (convError) {
    return { error: convError as Error }
  }

  // Mark all incoming messages as read
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: msgError } = await (supabase.from('messages') as any)
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('is_outgoing', false)

  if (msgError) {
    return { error: msgError as Error }
  }

  return { error: null }
}

// Archive/unarchive a conversation
export async function archiveConversation(
  conversationId: string,
  archived: boolean = true
): Promise<{ error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('conversations') as any)
    .update({ archived, is_read: true }) // Also mark as read when archiving
    .eq('id', conversationId)

  return { error: error as Error | null }
}

// Delete a conversation and all its messages
export async function deleteConversation(
  conversationId: string
): Promise<{ error: Error | null }> {
  // Delete messages first (foreign key constraint)
  const { error: msgError } = await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId)

  if (msgError) {
    return { error: msgError as Error }
  }

  // Delete conversation
  const { error: convError } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)

  return { error: convError as Error | null }
}

// Get unread message count for dashboard
export async function getUnreadCount(
  organizationId: string
): Promise<{ data: number; error: Error | null }> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      messages!inner(is_read, is_outgoing)
    `)
    .eq('organization_id', organizationId)

  if (error) {
    return { data: 0, error: error as Error }
  }

  // Count unread incoming messages across all conversations
  let unreadCount = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const conv of (data || []) as any[]) {
    const messages = (conv.messages as { is_read: boolean; is_outgoing: boolean }[]) || []
    unreadCount += messages.filter(m => !m.is_read && !m.is_outgoing).length
  }

  return { data: unreadCount, error: null }
}

// Fetch recent conversations for dashboard widget
export async function fetchRecentConversations(
  organizationId: string,
  limit: number = 5
): Promise<{ data: ConversationWithDetails[] | null; error: Error | null }> {
  const result = await fetchConversations(organizationId)

  if (result.error || !result.data) {
    return result
  }

  // Return only conversations with unread messages, limited
  const unreadFirst = result.data
    .sort((a, b) => b.unread_count - a.unread_count ||
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit)

  return { data: unreadFirst, error: null }
}
