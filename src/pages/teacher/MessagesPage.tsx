import { useState, useMemo, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { motion } from 'framer-motion';
import {
  Search,
  ChevronLeft,
  MoreHorizontal,
  Paperclip,
  Smile,
  Send,
  CheckCheck,
  Plus,
  X,
  Trash2,
} from 'lucide-react';
import { SectionLoader } from '@/components/ui/section-loader';
import { Spinner } from '@/components/ui/spinner';
import { pageVariants, pageTransition } from '@/lib/motion';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  fetchConversations,
  sendMessage,
  markConversationRead,
  findOrCreateConversation,
  deleteConversation,
  type ConversationWithDetails,
} from '@/services/messages';
import { sendNewMessageNotification } from '@/services/emails';
import type { Message } from '@/types/database';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from '@/components/ui/user-avatar'

import { formatMessageTimestamp } from '@/utils/dateFormatting'

const MessagesPage = () => {
  const { currentOrganization, profile } = useAuth();
  const organizationId = currentOrganization?.id;
  const organizationName = currentOrganization?.name || 'Ease';
  const senderName = profile?.name || 'Instruktør';

  // Data state
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // UI state
  const [activeConversation, setActiveConversation] = useState<ConversationWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');

  // State for new message composition
  const [isComposing, setIsComposing] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [newMessageBody, setNewMessageBody] = useState('');

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!organizationId) return;

    const { data, error } = await fetchConversations(organizationId);
    if (error) {
      toast.error('Kunne ikke laste meldinger. Prøv på nytt.');
      setLoading(false);
      return;
    }
    setConversations(data || []);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversation) {
      setCurrentMessages([]);
      return;
    }

    // Use messages from conversation (already fetched)
    setCurrentMessages(activeConversation.messages || []);

    // Mark as read
    if (activeConversation.unread_count > 0) {
      markConversationRead(activeConversation.id);
      // Update local state
      setConversations(prev => prev.map(c =>
        c.id === activeConversation.id
          ? { ...c, is_read: true, unread_count: 0 }
          : c
      ));
    }
  }, [activeConversation]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let result = conversations;

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        (c.participant?.name || '').toLowerCase().includes(query) ||
        (c.participant?.email || '').toLowerCase().includes(query) ||
        (c.last_message?.content || '').toLowerCase().includes(query)
      );
    }

    return result;
  }, [conversations, searchQuery]);

  // Auto-select first conversation
  useEffect(() => {
    if (filteredConversations.length > 0 && !activeConversation && !isComposing) {
      setActiveConversation(filteredConversations[0]);
    }
  }, [filteredConversations, activeConversation, isComposing]);

  // Handle selecting a conversation
  const handleSelectConversation = (conversation: ConversationWithDetails) => {
    setActiveConversation(conversation);
    setIsComposing(false);
  };

  const handleStartNewMessage = () => {
    setIsComposing(true);
    setActiveConversation(null);
  };

  const handleCancelComposition = () => {
    setIsComposing(false);
    setNewRecipient('');
    setNewMessageBody('');
    if (conversations.length > 0) {
      setActiveConversation(conversations[0]);
    }
  };

  // Send message in existing conversation
  const handleSendMessage = async () => {
    if (!activeConversation || !messageText.trim()) return;

    setSendingMessage(true);
    const { data: newMessage, error } = await sendMessage(
      activeConversation.id,
      messageText.trim(),
      true // outgoing
    );

    if (error) {
      toast.error('Kunne ikke sende melding. Prøv på nytt.');
      setSendingMessage(false);
      return;
    }

    // Update local state
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

      // Send email notification (don't block on this)
      const recipientEmail = activeConversation.participant?.email || activeConversation.guest_email;
      if (recipientEmail) {
        const conversationUrl = `${window.location.origin}/teacher/messages`;
        sendNewMessageNotification(
          recipientEmail,
          senderName,
          messageText.trim(),
          conversationUrl,
          organizationName
        ).catch(err => {
          logger.error('Failed to send email notification:', err);
          toast.warning('Melding sendt, men e-postvarsling feilet');
        });
      }
    }

    setMessageText('');
    setSendingMessage(false);
    toast.success('Melding sendt');
  };

  // Send new message (create conversation)
  const handleSendNewMessage = async () => {
    if (!organizationId || !newRecipient.trim() || !newMessageBody.trim()) return;

    setSendingMessage(true);

    // Find or create conversation
    const { data: conversation, error: convError } = await findOrCreateConversation(
      organizationId,
      newRecipient.trim()
    );

    if (convError || !conversation) {
      logger.error('Conversation creation error:', convError);
      toast.error('Kunne ikke opprette samtale');
      setSendingMessage(false);
      return;
    }

    // Send message
    const { error: msgError } = await sendMessage(
      conversation.id,
      newMessageBody.trim(),
      true
    );

    if (msgError) {
      toast.error('Kunne ikke sende melding. Prøv på nytt.');
      setSendingMessage(false);
      return;
    }

    // Send email notification (don't block on this)
    const conversationUrl = `${window.location.origin}/teacher/messages`;
    sendNewMessageNotification(
      newRecipient.trim(),
      senderName,
      newMessageBody.trim(),
      conversationUrl,
      organizationName
    ).catch(err => {
      logger.error('Failed to send email notification:', err);
      toast.warning('Melding sendt, men e-postvarsling feilet');
    });

    // Reload conversations and select new one
    await loadConversations();
    setIsComposing(false);
    setNewRecipient('');
    setNewMessageBody('');
    setSendingMessage(false);
    toast.success('Melding sendt');
  };

  // Delete conversation
  const handleDeleteConversation = async () => {
    if (!activeConversation) return;

    const { error } = await deleteConversation(activeConversation.id);
    if (error) {
      toast.error('Kunne ikke slette samtale');
      return;
    }

    setConversations(prev => prev.filter(c => c.id !== activeConversation.id));
    setActiveConversation(null);
    toast.success('Samtale slettet');
  };


  return (
      <div className="flex-1 flex min-h-full flex-col overflow-hidden bg-background">
        <MobileTeacherHeader title="Meldinger" />

        <motion.header
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
        >
          <div className="px-6 pb-0 pt-6 lg:px-8 lg:pt-8">
            <div className="mb-8">
              <h1 className="type-heading-1 text-foreground">Meldinger</h1>
              <p className="type-body mt-1 text-muted-foreground">
                Hold oversikt over samtaler med elever og svar raskt ved behov.
              </p>
            </div>
          </div>
        </motion.header>

        {/* Messages Layout: Split View */}
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="flex min-h-0 flex-1 px-6 pb-6 lg:px-8 lg:pb-8"
        >
          <Card className="flex min-h-0 w-full overflow-hidden rounded-xl">
          {/* Conversation List (Left Panel) */}
          <div className={cn(
            'w-full md:w-80 lg:w-96 flex-col border-r border-border bg-background',
            activeConversation || isComposing ? 'hidden md:flex' : 'flex'
          )}>
            {/* List Header */}
            <div className="border-b border-border px-5 py-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="type-title text-foreground">Samtaler</h2>
                <Button
                  onClick={handleStartNewMessage}
                  size="compact"
                  className="gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ny melding
                </Button>
              </div>

              {/* Search */}
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Søk"
                aria-label="Søk i meldinger"
                className="mb-4"
              />

            </div>

            {/* Conversations Scroll Area */}
            <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {loading ? (
                <SectionLoader size="md" />
              ) : filteredConversations.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title={searchQuery ? 'Ingen treff' : 'Ingen meldinger'}
                  description={searchQuery ? 'Prøv et annet søkeord.' : 'Nye meldinger vises her.'}
                  variant="compact"
                  className="mt-8"
                />
              ) : (
                filteredConversations.map((conversation) => {
                  return (
                <button
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`group relative flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left ios-ease ${
                    activeConversation?.id === conversation.id && !isComposing
                      ? 'border-border bg-surface-muted'
                      : conversation.is_read
                      ? 'border-transparent hover:bg-surface-muted opacity-70 hover:opacity-100'
                      : 'border-transparent hover:bg-surface-muted'
                  }`}
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      name={conversation.participant?.name}
                      email={conversation.participant?.email}
                      src={conversation.participant?.avatar_url}
                      size="lg"
                      className={activeConversation?.id !== conversation.id && conversation.unread_count === 0 ? 'opacity-90 group-hover:opacity-100' : ''}
                    />
                    {conversation.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xxs font-medium text-primary-foreground border-2 border-surface">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={`type-label truncate ${
                          activeConversation?.id === conversation.id && !isComposing
                            ? 'text-foreground'
                            : conversation.is_read ? 'text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {conversation.participant?.name || conversation.participant?.email || 'Ukjent'}
                      </span>
                      <span className="type-meta text-muted-foreground">
                        {formatMessageTimestamp(conversation.updated_at)}
                      </span>
                    </div>
                    <p
                      className={`type-body truncate ${
                        conversation.unread_count > 0
                          ? 'type-label text-foreground'
                          : activeConversation?.id === conversation.id
                          ? 'type-label text-muted-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {conversation.last_message?.content || 'Ingen meldinger'}
                    </p>
                  </div>
                  {conversation.unread_count > 0 && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" role="img" aria-label="Ulest" />
                  )}
                </button>
              );
              }))}
            </div>
          </div>

          {/* Chat View (Main Area) */}
          <div className={cn(
            'relative flex-1 flex-col bg-background',
            activeConversation || isComposing ? 'flex' : 'hidden md:flex'
          )}>

            {/* Composing New Message View */}
            {isComposing ? (
              <div className="flex h-full flex-1 flex-col bg-background">
                 <header className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-border bg-background/90 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleCancelComposition}
                        className="md:hidden -ml-2 text-muted-foreground hover:text-foreground"
                        aria-label="Tilbake"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </Button>
                    <h3 className="type-title text-foreground">Ny melding</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCancelComposition}
                      className="rounded-full text-muted-foreground hover:text-foreground"
                      aria-label="Lukk ny melding"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                </header>

                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                    <label htmlFor="compose-recipient" className="type-label-sm ml-1 text-foreground">Til</label>
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors pointer-events-none" />
                        <Input
                          id="compose-recipient"
                          type="text"
                          value={newRecipient}
                          onChange={(e) => setNewRecipient(e.target.value)}
                          placeholder="f.eks. navn@eksempel.no"
                          autoFocus
                          className="pl-10"
                        />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="compose-message-body" className="type-label-sm ml-1 text-foreground">Melding</label>
                    <div className="rounded-lg bg-background p-3 border border-border focus-within:ring-2 focus-within:ring-ring/50 ios-ease">
                        <Textarea
                          id="compose-message-body"
                          rows={8}
                          value={newMessageBody}
                          onChange={(e) => setNewMessageBody(e.target.value)}
                          placeholder="Skriv meldingen din her"
                          className="border-0 bg-transparent px-1 py-1 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:border-transparent min-h-0 custom-scrollbar"
                        />
                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-surface-elevated">
                           <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-muted-foreground" aria-label="Legg til vedlegg">
                                <Paperclip />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-muted-foreground" aria-label="Velg emoji">
                                    <Smile />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-64 p-2">
                                  <div className="grid grid-cols-6 gap-1" role="group" aria-label="Velg emoji">
                                    {['😊', '🙏', '👋', '🧘', '✨', '💚', '🌸', '💪', '🙌', '🌞', '🍵', '🤸'].map(emoji => (
                                      <button
                                        key={emoji}
                                        onClick={() => setNewMessageBody(prev => prev + emoji)}
                                        aria-label={emoji}
                                        className="rounded p-2 text-xl transition-colors hover:bg-surface-muted"
                                      >
                                        <span aria-hidden="true">{emoji}</span>
                                      </button>
                                    ))}
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                           </div>
                           <Button
                              size="compact"
                              className="gap-2"
                              onClick={handleSendNewMessage}
                              disabled={!newRecipient.trim() || !newMessageBody.trim() || sendingMessage}
                              aria-label={sendingMessage ? 'Sender melding' : 'Send melding'}
                            >
                              {sendingMessage ? (
                                <><Spinner size="sm" aria-hidden="true" /><span className="sr-only">Sender</span></>
                              ) : (
                                <>
                                  <span>Send</span>
                                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                                </>
                              )}
                            </Button>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Regular Chat Header */}
            <header className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-border bg-background/90 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="md:hidden -ml-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setActiveConversation(null)}
                  aria-label="Tilbake til samtaler"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                    {activeConversation && (() => {
                      return (
                      <>
                <div className="relative">
                  <UserAvatar
                    name={activeConversation.participant?.name}
                    email={activeConversation.participant?.email}
                    src={activeConversation.participant?.avatar_url}
                    size="lg"
                    ringClassName="ring-2 ring-white"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="type-label truncate text-foreground">{activeConversation.participant?.name || activeConversation.participant?.email || 'Ukjent'}</h3>
                          <p className="type-meta truncate text-muted-foreground">
                            {activeConversation.participant?.email || 'Elev'}
                          </p>
                        </div>
                      </>
                      );
                    })()}
              </div>
              <div className="flex items-center gap-2">
                    {/* Removed Phone and Zap icons */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground rounded-full" aria-label="Flere handlinger">
                  <MoreHorizontal />
                </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/5 [&_svg]:text-destructive"
                          onClick={handleDeleteConversation}
                        >
                          <Trash2 />
                          Slett samtale
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
              </div>
            </header>

            {/* Messages Area */}
            <div className="custom-scrollbar flex flex-1 flex-col space-y-6 overflow-y-auto p-6">
                  {!activeConversation ? (
                    <EmptyState
                      icon={Search}
                      title="Velg en samtale"
                      description="Velg en samtale fra listen til venstre for å lese og svare."
                      className="flex-1"
                    />
                  ) : currentMessages.length === 0 ? (
                    <EmptyState
                      icon={Send}
                      title="Ingen meldinger ennå"
                      description="Send den første meldingen for å starte samtalen."
                      className="flex-1"
                    />
                  ) : (
                    <>
              {/* Time Separator */}
              <div className="flex justify-center">
                <span className="type-eyebrow rounded-full bg-primary/10 px-3 py-1 text-primary">
                  I dag
                </span>
              </div>

                      {currentMessages.map((message) => {
                        return (
                <div
                  key={message.id}
                  className={`flex items-end gap-3 max-w-[85%] sm:max-w-[70%] group ${
                    message.is_outgoing ? 'self-end flex-row-reverse' : 'self-start'
                  }`}
                >
                          {message.is_outgoing ? (
                            <div className="type-meta mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                                Du
                            </div>
                          ) : (
                            <UserAvatar
                              name={activeConversation.participant?.name}
                              email={activeConversation.participant?.email}
                              src={activeConversation.participant?.avatar_url}
                              size="sm"
                              className="mb-1 opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                          )}

                  <div className={`flex flex-col gap-1 ${message.is_outgoing ? 'items-end' : ''}`}>
                    <div
                      className={`rounded-lg px-4 py-3 ${
                        message.is_outgoing
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-surface-muted rounded-bl-sm'
                      }`}
                    >
                      <p
                        className={`type-body leading-relaxed ${
                          message.is_outgoing ? '' : 'text-foreground'
                        }`}
                      >
                        {message.content}
                      </p>
                    </div>
                    <span
                      className={`type-meta flex items-center gap-1 text-muted-foreground ${
                        message.is_outgoing ? 'pr-1' : 'pl-1'
                      }`}
                    >
                      {formatMessageTimestamp(message.created_at)}
                      {message.is_outgoing && message.is_read && (
                        <CheckCheck className="h-3 w-3 text-status-confirmed-text" />
                      )}
                    </span>
                  </div>
                </div>
                        );
                      })}
                    </>
                  )}
            </div>

            {/* Input Area */}
            <div className="p-6 pt-2 bg-background">
              <div className="flex flex-col gap-2 rounded-lg bg-background p-2 border border-border focus-within:ring-2 focus-within:ring-ring/50 ios-ease relative">
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
                  disabled={!activeConversation || sendingMessage}
                  className="border-0 bg-transparent px-3 py-2 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:border-transparent max-h-32 min-h-[44px]"
                />

                    <div className="flex items-center justify-between px-2 pb-1">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-muted-foreground"
                          aria-label="Legg til vedlegg"
                        >
                          <Paperclip />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-muted-foreground" aria-label="Velg emoji">
                              <Smile />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-64 p-2">
                            <div className="grid grid-cols-6 gap-1" role="group" aria-label="Velg emoji">
                              {['😊', '🙏', '👋', '🧘', '✨', '💚', '🌸', '💪', '🙌', '🌞', '🍵', '🤸'].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => setMessageText(prev => prev + emoji)}
                                  aria-label={emoji}
                                  className="rounded p-2 text-xl transition-colors hover:bg-surface-muted"
                                >
                                  <span aria-hidden="true">{emoji}</span>
                                </button>
                              ))}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {/* Removed Zap (Templates) button */}
                      </div>

                      <Button
                        disabled={!activeConversation || !messageText.trim() || sendingMessage}
                        size="compact"
                        className="gap-2"
                        onClick={handleSendMessage}
                        aria-label={sendingMessage ? 'Sender melding' : 'Send melding'}
                      >
                        {sendingMessage ? (
                          <><Spinner size="sm" aria-hidden="true" /><span className="sr-only">Sender</span></>
                        ) : (
                          <>
                            <span>Send</span>
                            <Send className="h-3.5 w-3.5" aria-hidden="true" />
                          </>
                        )}
                      </Button>
                </div>
              </div>
              <p className="type-meta mt-3 text-center text-muted-foreground">
                Trykk <span className="type-label-sm text-muted-foreground">Enter</span> for å sende
              </p>
            </div>
              </>
            )}
          </div>
          </Card>
        </motion.div>
      </div>
  );
};

export default MessagesPage;
