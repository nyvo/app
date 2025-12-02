import { useState, useMemo } from 'react';
import {
  Leaf,
  Menu,
  Search,
  ChevronLeft,
  MoreHorizontal,
  Paperclip,
  Smile,
  Send,
  CheckCheck,
  Plus,
  X,
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { useEmptyState } from '@/context/EmptyStateContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/search-input';
import EmptyStateToggle from '@/components/ui/EmptyStateToggle';
import {
  mockConversations,
  mockMessages,
  emptyConversations,
  emptyMessages,
  type Conversation
} from '@/data/mockData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const MessagesPage = () => {
  const { showEmptyState } = useEmptyState();

  const conversations = showEmptyState ? emptyConversations : mockConversations;
  const messages = showEmptyState ? emptyMessages : mockMessages;

  const [activeConversation, setActiveConversation] = useState<Conversation | null>(
    conversations.length > 0 ? conversations[0] : null
  );
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'archive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');

  // State for new message composition
  const [isComposing, setIsComposing] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [newMessageBody, setNewMessageBody] = useState('');

  const filteredConversations = useMemo(() => {
    let result = conversations;

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.lastMessage.toLowerCase().includes(query)
      );
    }

    // Filter by tab
    if (filterTab === 'unread') {
      result = result.filter(c => (c.unreadCount || 0) > 0);
    } else if (filterTab === 'archive') {
      // Mock archive filter - just filter out unread ones or show nothing if no archive prop
      // Since we don't have an 'isArchived' prop, we'll just show read messages for now
      // or return empty if we want to simulate empty archive
      result = result.filter(c => c.isRead);
    }

    return result;
  }, [conversations, searchQuery, filterTab]);

  // Reset active conversation if list becomes empty or non-empty
  if (filteredConversations.length > 0 && !activeConversation && !isComposing) {
    setActiveConversation(filteredConversations[0]);
  } else if (filteredConversations.length === 0 && activeConversation) {
    setActiveConversation(null);
  }

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

  return (
    <SidebarProvider>
      <TeacherSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-surface">
        {/* Mobile Header */}
        <div className="flex md:hidden items-center justify-between p-6 border-b border-border bg-surface/80 backdrop-blur-xl z-30 shrink-0">
          <div className="flex items-center gap-3">
            <Leaf className="h-5 w-5 text-primary" />
            <span className="font-geist text-base font-semibold text-text-primary">Ease</span>
          </div>
          <SidebarTrigger>
            <Menu className="h-6 w-6 text-muted-foreground" />
          </SidebarTrigger>
        </div>

        {/* Messages Layout: Split View */}
        <div className="flex h-full w-full overflow-hidden">
          {/* Conversation List (Left Panel) */}
          <div className="hidden md:flex w-80 lg:w-96 flex-col border-r border-border bg-surface">
            {/* List Header */}
            <div className="p-5 pb-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-geist text-xl font-medium tracking-tight text-text-primary">Meldinger</h2>
                <Button
                  onClick={handleStartNewMessage}
                  size="compact"
                  className="gap-2"
                >
                  <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
                  Ny melding
                </Button>
              </div>

              {/* Search */}
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Søk i meldinger..."
                aria-label="Søk i meldinger"
                className="mb-4"
              />

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`h-10 rounded-lg px-3 py-2 text-xs font-medium ios-ease ${
                    filterTab === 'all'
                      ? 'border border-border bg-white text-text-primary shadow-sm'
                      : 'border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                  }`}
                >
                  Alle
                </button>
                <button
                  onClick={() => setFilterTab('unread')}
                  className={`h-10 rounded-lg px-3 py-2 text-xs font-medium ios-ease ${
                    filterTab === 'unread'
                      ? 'border border-border bg-white text-text-primary shadow-sm'
                      : 'border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                  }`}
                >
                  Ulest
                </button>
                <button
                  onClick={() => setFilterTab('archive')}
                  className={`h-10 rounded-lg px-3 py-2 text-xs font-medium ios-ease ${
                    filterTab === 'archive'
                      ? 'border border-border bg-white text-text-primary shadow-sm'
                      : 'border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                  }`}
                >
                  Arkiv
                </button>
              </div>
            </div>

            {/* Conversations Scroll Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-1">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-4 mt-8">
                  <p className="text-sm font-medium text-text-primary">Ingen meldinger</p>
                  <p className="text-xs text-muted-foreground mt-1">Ingen meldinger funnet med valgte filter.</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => {
                    setActiveConversation(conversation);
                    setIsComposing(false);
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left group relative ${
                    activeConversation?.id === conversation.id && !isComposing
                      ? 'bg-white border border-border shadow-sm'
                      : conversation.isRead
                      ? 'hover:bg-white border border-transparent hover:border-border hover:shadow-sm opacity-70 hover:opacity-100'
                      : 'hover:bg-white border border-transparent hover:border-border hover:shadow-sm'
                  }`}
                >
                  <div className="relative shrink-0">
                    {conversation.avatar ? (
                      <img
                        src={conversation.avatar}
                        alt="Avatar"
                        className={`h-10 w-10 rounded-full object-cover ${
                          activeConversation?.id !== conversation.id && !conversation.unreadCount ? 'opacity-90 group-hover:opacity-100' : ''
                        }`}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-border flex items-center justify-center text-muted-foreground text-xs font-bold">
                        {conversation.initials}
                      </div>
                    )}
                    {conversation.unreadCount && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-text-primary text-xxs font-bold text-white border-2 border-surface">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={`text-sm font-medium ${
                          conversation.isRead ? 'text-sidebar-foreground' : 'text-text-primary'
                        }`}
                      >
                        {conversation.name}
                      </span>
                      <span
                        className={`text-xxs ${
                          conversation.isRead ? 'text-text-tertiary' : 'text-muted-foreground'
                        }`}
                      >
                        {conversation.timestamp}
                      </span>
                    </div>
                    <p
                      className={`text-xs truncate ${
                        conversation.unreadCount
                          ? 'text-text-primary font-medium'
                          : activeConversation?.id === conversation.id
                          ? 'text-text-secondary font-medium'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {conversation.lastMessage}
                    </p>
                  </div>
                  {conversation.unreadCount && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                  {activeConversation?.id === conversation.id && !isComposing && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-text-primary" />
                  )}
                </button>
              )))}
            </div>
          </div>

          {/* Chat View (Main Area) */}
          <div className="flex-1 flex flex-col h-full bg-surface relative">

            {/* Composing New Message View */}
            {isComposing ? (
              <div className="flex-1 flex flex-col h-full bg-surface">
                 <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/90 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleCancelComposition}
                        className="md:hidden text-muted-foreground hover:text-text-primary mr-1"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <h3 className="text-sm font-semibold text-text-primary">Ny melding</h3>
                    </div>
                    <button
                      onClick={handleCancelComposition}
                      className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-elevated rounded-full transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                </header>

                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground ml-1">Til:</label>
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary group-focus-within:text-text-primary transition-colors pointer-events-none" />
                        <Input
                          type="text"
                          value={newRecipient}
                          onChange={(e) => setNewRecipient(e.target.value)}
                          placeholder="Søk etter navn eller e-post..."
                          autoFocus
                          className="pl-10"
                        />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-medium text-muted-foreground ml-1">Melding:</label>
                    <div className="rounded-2xl border border-border bg-white p-3 shadow-sm focus-within:ring-4 focus-within:ring-border/30 focus-within:border-ring transition-all">
                        <textarea
                          rows={8}
                          value={newMessageBody}
                          onChange={(e) => setNewMessageBody(e.target.value)}
                          placeholder="Skriv din melding her..."
                          className="w-full resize-none bg-transparent px-1 py-1 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none custom-scrollbar"
                        />
                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-surface-elevated">
                           <div className="flex items-center gap-1">
                              <button className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-elevated rounded-lg transition-colors">
                                <Paperclip className="h-4 w-4" />
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-elevated rounded-lg transition-colors">
                                    <Smile className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-64 p-2">
                                  <div className="grid grid-cols-6 gap-1">
                                    {['😊', '🙏', '👋', '🧘', '✨', '💚', '🌸', '💪', '🙌', '🌞', '🍵', '🤸'].map(emoji => (
                                      <button
                                        key={emoji}
                                        onClick={() => setNewMessageBody(prev => prev + emoji)}
                                        className="text-xl p-1 hover:bg-surface-elevated rounded transition-colors"
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
                            >
                              <span>Send</span>
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Regular Chat Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/90 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <button className="md:hidden text-muted-foreground hover:text-text-primary mr-1">
                  <ChevronLeft className="h-6 w-6" />
                </button>

                    {activeConversation ? (
                      <>
                <div className="relative">
                          {activeConversation.avatar ? (
                  <img
                              src={activeConversation.avatar}
                    alt="Avatar"
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                  />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-border flex items-center justify-center text-muted-foreground text-xs font-bold ring-2 ring-white shadow-sm">
                              {activeConversation.initials}
                            </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{activeConversation.name}</h3>
                          {/* Removed "Online" status for email/inbox style feel */}
                          <p className="text-xs text-muted-foreground">
                            {activeConversation.id === '1' ? 'Ny henvendelse' : 'Tidligere student'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="h-10 w-32 bg-gray-100 rounded animate-pulse"></div>
                    )}
              </div>
              <div className="flex items-center gap-2">
                    {/* Removed Phone and Zap icons */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                <button className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-elevated rounded-full transition-colors" aria-label="Flere handlinger">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="cursor-pointer text-text-secondary focus:text-text-primary focus:bg-surface-elevated">
                           Marker som ulest
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-text-secondary focus:text-text-primary focus:bg-surface-elevated">
                           Arkiver samtale
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
                           Slett samtale
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
              </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar flex flex-col">
                  {!activeConversation ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                        <p>Velg en samtale for å lese</p>
                    </div>
                  ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                        <p>Ingen meldinger i denne samtalen ennå</p>
                      </div>
                  ) : (
                    <>
              {/* Time Separator */}
              <div className="flex justify-center">
                <span className="text-xxs font-medium text-text-tertiary bg-surface-elevated px-3 py-1 rounded-full uppercase tracking-wide">
                  I dag
                </span>
              </div>

                      {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-end gap-3 max-w-[85%] sm:max-w-[70%] group ${
                    message.isOutgoing ? 'self-end flex-row-reverse' : 'self-start'
                  }`}
                >
                          {message.isOutgoing ? (
                            // No avatar for self, or teacher avatar
                            <div className="h-8 w-8 rounded-full bg-text-primary flex items-center justify-center text-surface-elevated text-xxs font-bold mb-1">
                                Du
                            </div>
                          ) : message.avatar ? (
                  <img
                    src={message.avatar}
                    alt="Avatar"
                              className="h-8 w-8 rounded-full object-cover mb-1 opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-border flex items-center justify-center text-muted-foreground text-xxs font-bold mb-1">
                              {activeConversation.initials}
                            </div>
                          )}

                  <div className={`flex flex-col gap-1 ${message.isOutgoing ? 'items-end' : ''}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-sm ${
                        message.isOutgoing
                          ? 'bg-text-primary text-surface-elevated rounded-br-sm shadow-md'
                          : 'bg-white border border-border rounded-bl-sm'
                      }`}
                    >
                      <p
                        className={`text-sm leading-relaxed ${
                          message.isOutgoing ? 'font-light' : 'text-sidebar-foreground'
                        }`}
                      >
                        {message.content}
                      </p>
                    </div>
                    <span
                      className={`text-xxs text-text-tertiary flex items-center gap-1 ${
                        message.isOutgoing ? 'pr-1' : 'pl-1'
                      }`}
                    >
                      {message.timestamp}
                      {message.isOutgoing && message.isRead && (
                        <CheckCheck className="h-3 w-3 text-status-confirmed-text" />
                      )}
                    </span>
                  </div>
                </div>
              ))}
                    </>
                  )}
            </div>

            {/* Input Area */}
            <div className="p-6 pt-2 bg-surface">
              <div className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-2 shadow-sm focus-within:ring-4 focus-within:ring-border/30 focus-within:border-ring transition-all relative">
                <textarea
                  rows={1}
                  placeholder="Skriv en melding..."
                  aria-label="Skriv en melding"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={!activeConversation}
                  className="w-full resize-none bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none custom-scrollbar max-h-32 min-h-[44px]"
                />

                    <div className="flex items-center justify-between px-2 pb-1">
                      <div className="flex items-center gap-1">
                        <button
                          className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-elevated rounded-lg transition-colors"
                          title="Legg til fil"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-elevated rounded-lg transition-colors">
                              <Smile className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-64 p-2">
                            <div className="grid grid-cols-6 gap-1">
                              {['😊', '🙏', '👋', '🧘', '✨', '💚', '🌸', '💪', '🙌', '🌞', '🍵', '🤸'].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => setMessageText(prev => prev + emoji)}
                                  className="text-xl p-1 hover:bg-surface-elevated rounded transition-colors"
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
                        disabled={!activeConversation}
                        size="compact"
                        className="gap-2"
                      >
                    <span>Send</span>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xxs text-text-tertiary text-center mt-3">
                Trykk <span className="font-medium text-muted-foreground">Enter</span> for å sende
              </p>
            </div>
              </>
            )}
          </div>
        </div>
      </main>
      <EmptyStateToggle />
    </SidebarProvider>
  );
};

export default MessagesPage;
