import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Send, CheckCheck } from '@/lib/icons';
import { SectionLoader } from '@/components/ui/section-loader';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/ui/user-avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  fetchStudentConversations,
  sendMessage,
  markStudentConversationRead,
  type ConversationWithDetails,
} from '@/services/messages';
import type { Message } from '@/types/database';
import { formatMessageTimestamp } from '@/utils/dateFormatting';

const StudentMessagesPage = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeConversation, setActiveConversation] = useState<ConversationWithDetails | null>(null);
  const [messageText, setMessageText] = useState('');

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await fetchStudentConversations(userId);
    if (error) {
      toast.error('Kunne ikke laste meldinger');
      setLoading(false);
      return;
    }
    setConversations(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversation) {
      setCurrentMessages([]);
      return;
    }
    setCurrentMessages(activeConversation.messages || []);

    // Mark as read (student side: outgoing messages from teacher)
    if (activeConversation.unread_count > 0) {
      markStudentConversationRead(activeConversation.id);
      setConversations(prev => prev.map(c =>
        c.id === activeConversation.id
          ? { ...c, unread_count: 0 }
          : c
      ));
    }
  }, [activeConversation]);

  // Auto-select first conversation on desktop
  useEffect(() => {
    if (conversations.length > 0 && !activeConversation) {
      setActiveConversation(conversations[0]);
    }
  }, [conversations, activeConversation]);

  const handleSelectConversation = (conversation: ConversationWithDetails) => {
    setActiveConversation(conversation);
  };

  // Send message (student replies are is_outgoing = false from teacher perspective)
  const handleSendMessage = async () => {
    if (!activeConversation || !messageText.trim()) return;

    setSendingMessage(true);
    const { data: newMessage, error } = await sendMessage(
      activeConversation.id,
      messageText.trim(),
      false // NOT outgoing from teacher's perspective = student sent it
    );

    if (error) {
      toast.error('Kunne ikke sende melding');
      setSendingMessage(false);
      return;
    }

    if (newMessage) {
      setCurrentMessages(prev => [...prev, newMessage]);
      setConversations(prev => prev.map(c =>
        c.id === activeConversation.id
          ? {
              ...c,
              last_message: newMessage,
              messages: [...c.messages, newMessage],
              updated_at: new Date().toISOString()
            }
          : c
      ));
    }

    setMessageText('');
    setSendingMessage(false);
    toast.success('Melding sendt');
  };

  return (
    <>
      <div className="mb-8 space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Meldinger</h1>
        <p className="text-sm text-muted-foreground">Kommuniser med instruktørene dine</p>
      </div>

      <Card className="flex min-h-[480px] overflow-hidden border-border bg-card">
        {/* Conversation List */}
        <div className={cn(
          'w-full md:w-80 lg:w-96 flex-col border-r border-border',
          activeConversation ? 'hidden md:flex' : 'flex'
        )}>
          <div className="border-b border-border px-5 py-4">
            <div className="space-y-1">
              <h2 className="text-base font-medium text-foreground">Samtaler</h2>
              <p className="text-sm text-muted-foreground">
                Meldinger knyttet til kursene dine.
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <SectionLoader size="md" />
            ) : conversations.length === 0 ? (
              <EmptyState
                title="Ingen meldinger"
                description="Du kan sende melding til instruktører fra kursoversikten."
                variant="compact"
                className="min-h-40"
              />
            ) : (
              <div className="p-3 space-y-1">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
                      activeConversation?.id === conversation.id
                        ? 'bg-muted'
                        : 'hover:bg-muted'
                    )}
                  >
                    <UserAvatar
                      name={conversation.participant?.name}
                      src={conversation.participant?.avatar_url}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium truncate text-foreground">
                          {conversation.participant?.name || 'Ukjent'}
                        </span>
                        <span className="text-xs font-medium tracking-wide ml-2 shrink-0 text-muted-foreground">
                          {formatMessageTimestamp(conversation.updated_at)}
                        </span>
                      </div>
                      <p className={cn(
                        'truncate',
                        conversation.unread_count > 0
                          ? 'text-sm font-medium text-foreground'
                          : 'text-sm text-muted-foreground'
                      )}>
                        {conversation.last_message?.content || 'Ingen meldinger'}
                      </p>
                    </div>
                    {conversation.unread_count > 0 && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={cn(
          'flex-1 flex-col',
          activeConversation ? 'flex' : 'hidden md:flex'
        )}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <header className="flex items-center gap-3 px-6 py-4 border-b border-border">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="md:hidden -ml-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setActiveConversation(null)}
                  aria-label="Tilbake"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <UserAvatar
                  name={activeConversation.participant?.name}
                  src={activeConversation.participant?.avatar_url}
                  size="lg"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-medium truncate text-foreground">
                    {activeConversation.participant?.name || 'Ukjent'}
                  </h3>
                </div>
              </header>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
                {currentMessages.length === 0 ? (
                  <EmptyState
                    title="Ingen meldinger ennå"
                    description="Samtalen er tom så langt."
                    variant="compact"
                    className="h-full justify-center"
                  />
                ) : (
                  currentMessages.map((message) => {
                    // is_outgoing = true means teacher sent it = incoming for student
                    const isFromStudent = !message.is_outgoing;
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex items-end gap-3 max-w-[85%] sm:max-w-[70%]',
                          isFromStudent ? 'self-end flex-row-reverse' : 'self-start'
                        )}
                      >
                        {!isFromStudent && (
                          <UserAvatar
                            name={activeConversation.participant?.name}
                            src={activeConversation.participant?.avatar_url}
                            size="sm"
                            className="mb-1"
                          />
                        )}
                        <div className={cn('flex flex-col gap-1', isFromStudent ? 'items-end' : '')}>
                          <div className={cn(
                            'px-4 py-3 rounded-lg',
                            isFromStudent
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-muted rounded-bl-sm'
                          )}>
                            <p className={cn(
                              'text-sm leading-relaxed',
                              isFromStudent ? '' : 'text-foreground'
                            )}>
                              {message.content}
                            </p>
                          </div>
                          <span className="text-xs font-medium tracking-wide flex items-center gap-1 px-1 text-muted-foreground">
                            {formatMessageTimestamp(message.created_at)}
                            {isFromStudent && message.is_read && (
                              <CheckCheck className="h-3 w-3 text-green-800" />
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Textarea
                    rows={1}
                    placeholder="Skriv en melding"
                    aria-label="Skriv en melding"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={sendingMessage}
                    className="flex-1 max-h-32 min-h-[44px]"
                  />
                  <Button
                    disabled={!messageText.trim() || sendingMessage}
                    size="icon"
                    onClick={handleSendMessage}
                    aria-label="Send melding"
                  >
                    {sendingMessage ? (
                      <Spinner size="sm" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="Velg en samtale"
              description="Åpne en samtale for å lese eller sende meldinger."
              variant="compact"
              className="h-full justify-center"
            />
          )}
        </div>
      </Card>
    </>
  );
};

export default StudentMessagesPage;
