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
import { SidebarProvider } from '@/components/ui/sidebar';
import { pageVariants, pageTransition } from '@/lib/motion';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchInput } from '@/components/ui/search-input';
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
    <SidebarProvider>
      <TeacherSidebar />

      <main className="flex-1 flex flex-col h-dvh overflow-hidden bg-surface">
        <MobileTeacherHeader title="Meldinger" />

        {/* Messages Layout: Split View */}
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="flex h-full w-full overflow-hidden min-h-0"
        >
          {/* Conversation List (Left Panel) */}
          <div className={cn(
            'w-full md:w-80 lg:w-96 flex-col border-r border-zinc-200 bg-surface',
            activeConversation || isComposing ? 'hidden md:flex' : 'flex'
          )}>
            {/* List Header */}
            <div className="p-6 pb-2">
              <div className="flex items-center justify-between mb-4">
                <h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary">Meldinger</h1>
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
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-3 space-y-2">
              {loading ? (
                <SectionLoader size="md" />
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-4 mt-8">
                  <p className="text-sm font-medium text-text-primary">Ingen meldinger</p>
                  <p className="text-sm text-text-secondary mt-1">{searchQuery ? 'Ingen treff.' : 'Nye meldinger vises her.'}</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  return (
                <button
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl ios-ease text-left group relative border ${
                    activeConversation?.id === conversation.id && !isComposing
                      ? 'bg-white border-zinc-200'
                      : conversation.is_read
                      ? 'border-transparent hover:bg-zinc-50 opacity-70 hover:opacity-100'
                      : 'border-transparent hover:bg-zinc-50'
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
                        className={`text-sm font-medium truncate ${
                          activeConversation?.id === conversation.id && !isComposing
                            ? 'text-text-primary'
                            : conversation.is_read ? 'text-text-secondary' : 'text-text-primary'
                        }`}
                      >
                        {conversation.participant?.name || conversation.participant?.email || 'Ukjent'}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {formatMessageTimestamp(conversation.updated_at)}
                      </span>
                    </div>
                    <p
                      className={`text-sm truncate ${
                        conversation.unread_count > 0
                          ? 'text-text-primary font-medium'
                          : activeConversation?.id === conversation.id
                          ? 'text-text-secondary font-medium'
                          : 'text-text-secondary'
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
            'flex-1 flex-col h-full bg-surface relative',
            activeConversation || isComposing ? 'flex' : 'hidden md:flex'
          )}>

            {/* Composing New Message View */}
            {isComposing ? (
              <div className="flex-1 flex flex-col h-full bg-surface">
                 <header className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-surface/90 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleCancelComposition}
                        className="md:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary cursor-pointer"
                        aria-label="Tilbake"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <h3 className="text-sm font-medium text-text-primary">Ny melding</h3>
                    </div>
                    <button
                      onClick={handleCancelComposition}
                      className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-elevated rounded-full transition-colors cursor-pointer"
                      aria-label="Lukk ny melding"
                    >
                      <X className="h-4 w-4" />
                    </button>
                </header>

                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="compose-recipient" className="text-xs font-medium text-text-primary ml-1">Til</label>
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary group-focus-within:text-text-primary transition-colors pointer-events-none" />
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
                    <label htmlFor="compose-message-body" className="text-xs font-medium text-text-primary ml-1">Melding</label>
                    <div className="rounded-xl bg-white p-3 border border-zinc-200 focus-within:ring-2 focus-within:ring-zinc-400/50 ios-ease">
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
                              <Button variant="ghost" size="icon-sm" className="text-text-tertiary hover:text-text-secondary" aria-label="Legg til vedlegg">
                                <Paperclip />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-sm" className="text-text-tertiary hover:text-text-secondary" aria-label="Velg emoji">
                                    <Smile />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-64 p-2">
                                  <div className="grid grid-cols-6 gap-1">
                                    {['😊', '🙏', '👋', '🧘', '✨', '💚', '🌸', '💪', '🙌', '🌞', '🍵', '🤸'].map(emoji => (
                                      <button
                                        key={emoji}
                                        onClick={() => setNewMessageBody(prev => prev + emoji)}
                                        className="text-xl p-2 hover:bg-surface-elevated rounded transition-colors"
                                      >
                                        {emoji}
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
                            >
                              {sendingMessage ? (
                                <Spinner size="sm" />
                              ) : (
                                <>
                                  <span>Send</span>
                                  <Send className="h-3.5 w-3.5" />
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
            <header className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-surface/90 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <button
                  className="md:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary"
                  onClick={() => setActiveConversation(null)}
                  aria-label="Tilbake til samtaler"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

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
                  <h3 className="text-sm font-medium text-text-primary truncate">{activeConversation.participant?.name || activeConversation.participant?.email || 'Ukjent'}</h3>
                          <p className="text-xs text-text-secondary truncate">
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
                <Button variant="ghost" size="icon-sm" className="text-text-tertiary hover:text-text-primary rounded-full" aria-label="Flere handlinger">
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
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar flex flex-col">
                  {!activeConversation ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-sm text-text-secondary">Velg en samtale fra listen til venstre</p>
                    </div>
                  ) : currentMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                        <p>Ingen meldinger i samtalen ennå</p>
                      </div>
                  ) : (
                    <>
              {/* Time Separator */}
              <div className="flex justify-center">
                <span className="text-xxs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
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
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xxs font-medium mb-1 shrink-0">
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
                      className={`px-4 py-3 rounded-xl ${
                        message.is_outgoing
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-white rounded-bl-sm'
                      }`}
                    >
                      <p
                        className={`text-sm leading-relaxed ${
                          message.is_outgoing ? '' : 'text-text-primary'
                        }`}
                      >
                        {message.content}
                      </p>
                    </div>
                    <span
                      className={`text-xs text-text-secondary flex items-center gap-1 ${
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
            <div className="p-6 pt-2 bg-surface">
              <div className="flex flex-col gap-2 rounded-xl bg-white p-2 border border-zinc-200 focus-within:ring-2 focus-within:ring-zinc-400/50 ios-ease relative">
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
                          className="text-text-tertiary hover:text-text-secondary"
                          aria-label="Legg til vedlegg"
                        >
                          <Paperclip />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="text-text-tertiary hover:text-text-secondary" aria-label="Velg emoji">
                              <Smile />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-64 p-2">
                            <div className="grid grid-cols-6 gap-1">
                              {['😊', '🙏', '👋', '🧘', '✨', '💚', '🌸', '💪', '🙌', '🌞', '🍵', '🤸'].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => setMessageText(prev => prev + emoji)}
                                  className="text-xl p-2 hover:bg-surface-elevated rounded transition-colors"
                                >
                                  {emoji}
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
                      >
                        {sendingMessage ? (
                          <Spinner size="sm" />
                        ) : (
                          <>
                            <span>Send</span>
                            <Send className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                </div>
              </div>
              <p className="text-xs text-text-secondary text-center mt-3">
                Trykk <span className="font-medium text-text-secondary">Enter</span> for å sende
              </p>
            </div>
              </>
            )}
          </div>
        </motion.div>
      </main>
    </SidebarProvider>
  );
};

export default MessagesPage;
