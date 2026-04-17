import { useState, useMemo, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { AnimatePresence, motion } from 'framer-motion';
import { Send } from '@/lib/icons';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
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
import { ConversationList, ChatView, ComposeView } from '@/components/teacher/messages';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';

const MessagesPage = () => {
  const { currentOrganization, profile } = useAuth();
  const { refreshUnreadMessages } = useTeacherShell();
  const organizationId = currentOrganization?.id;
  const organizationName = currentOrganization?.name || 'Ease';
  const senderName = profile?.name || 'Instruktør';
  const isMobile = useIsMobile();

  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  const [activeConversation, setActiveConversation] = useState<ConversationWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isComposing, setIsComposing] = useState(false);

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

    setCurrentMessages(activeConversation.messages || []);

    if (activeConversation.unread_count > 0) {
      markConversationRead(activeConversation.id);
      setConversations(prev => prev.map(c =>
        c.id === activeConversation.id
          ? { ...c, is_read: true, unread_count: 0 }
          : c
      ));
      refreshUnreadMessages();
    }
  }, [activeConversation]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase().trim();
    return conversations.filter(c =>
      (c.participant?.name || '').toLowerCase().includes(query) ||
      (c.participant?.email || '').toLowerCase().includes(query) ||
      (c.last_message?.content || '').toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Auto-select first conversation (desktop only)
  useEffect(() => {
    if (!isMobile && filteredConversations.length > 0 && !activeConversation && !isComposing) {
      setActiveConversation(filteredConversations[0]);
    }
  }, [filteredConversations, activeConversation, isComposing, isMobile]);

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
      true
    );

    if (error) {
      toast.error('Kunne ikke sende melding. Prøv på nytt.');
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
  const handleSendNewMessage = async (recipient: string, body: string) => {
    if (!organizationId) return;

    setSendingMessage(true);

    const { data: conversation, error: convError } = await findOrCreateConversation(
      organizationId,
      recipient
    );

    if (convError || !conversation) {
      logger.error('Conversation creation error:', convError);
      toast.error('Kunne ikke opprette samtale');
      setSendingMessage(false);
      return;
    }

    const { error: msgError } = await sendMessage(conversation.id, body, true);

    if (msgError) {
      toast.error('Kunne ikke sende melding. Prøv på nytt.');
      setSendingMessage(false);
      return;
    }

    const conversationUrl = `${window.location.origin}/teacher/messages`;
    sendNewMessageNotification(
      recipient,
      senderName,
      body,
      conversationUrl,
      organizationName
    ).catch(err => {
      logger.error('Failed to send email notification:', err);
      toast.warning('Melding sendt, men e-postvarsling feilet');
    });

    await loadConversations();
    setIsComposing(false);
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

  // Mobile: show either the list or the detail view
  if (isMobile) {
    return (
      <div className="flex-1 flex min-h-full flex-col overflow-hidden bg-background">
        <MobileTeacherHeader title="Meldinger" />
        {activeConversation ? (
          <ChatView
            conversation={activeConversation}
            messages={currentMessages}
            messageText={messageText}
            onMessageTextChange={setMessageText}
            onSend={handleSendMessage}
            onDelete={handleDeleteConversation}
            onBack={() => setActiveConversation(null)}
            sending={sendingMessage}
          />
        ) : isComposing ? (
          <ComposeView
            onCancel={handleCancelComposition}
            onSend={handleSendNewMessage}
            sending={sendingMessage}
          />
        ) : (
          <ConversationList
            conversations={filteredConversations}
            activeConversationId={null}
            isComposing={false}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelect={handleSelectConversation}
            onNewMessage={handleStartNewMessage}
            loading={loading}
          />
        )}
      </div>
    );
  }

  // Desktop: split-view layout matching SchedulePage
  return (
    <main className="flex-1 flex min-h-full flex-col overflow-hidden bg-background">
      <MobileTeacherHeader title="Meldinger" />

      <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
        {/* Left panel — conversation list */}
        <div className="w-80 lg:w-96 shrink-0 overflow-hidden border-r border-border">
          <ConversationList
            conversations={filteredConversations}
            activeConversationId={activeConversation?.id ?? null}
            isComposing={isComposing}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelect={handleSelectConversation}
            onNewMessage={handleStartNewMessage}
            loading={loading}
          />
        </div>

        {/* Right panel — chat / compose / empty */}
        <AnimatePresence mode="wait">
          {isComposing ? (
            <motion.div
              key="compose"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex-1 min-h-0 overflow-hidden"
            >
              <ComposeView
                onCancel={handleCancelComposition}
                onSend={handleSendNewMessage}
                sending={sendingMessage}
              />
            </motion.div>
          ) : activeConversation ? (
            <motion.div
              key={activeConversation.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex-1 min-h-0 overflow-hidden"
            >
              <ChatView
                conversation={activeConversation}
                messages={currentMessages}
                messageText={messageText}
                onMessageTextChange={setMessageText}
                onSend={handleSendMessage}
                onDelete={handleDeleteConversation}
                onBack={() => setActiveConversation(null)}
                sending={sendingMessage}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex-1 min-h-0 overflow-hidden flex items-center justify-center"
            >
              <EmptyState
                icon={Send}
                title="Velg en samtale"
                description="Velg en samtale fra listen til venstre for å lese og svare."
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

export default MessagesPage;
