import { useState, useMemo } from 'react';
import {
  Flower2,
  Menu,
  Search,
  ChevronLeft,
  MoreHorizontal,
  Paperclip,
  Smile,
  Send,
  CheckCheck,
  Eye,
  EyeOff,
  Plus,
  X,
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { useEmptyState } from '@/context/EmptyStateContext';
import { Button } from '@/components/ui/button';
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
  const { showEmptyState, toggleEmptyState } = useEmptyState();
  
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

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#FDFBF7]">
        {/* Mobile Header */}
        <div className="flex md:hidden items-center justify-between p-6 border-b border-[#E7E5E4] bg-[#FDFBF7]/80 backdrop-blur-xl z-30 shrink-0">
          <div className="flex items-center gap-3">
            <Flower2 className="h-5 w-5 text-[#354F41]" />
            <span className="font-geist text-base font-semibold text-[#292524]">ZenStudio</span>
          </div>
          <SidebarTrigger>
            <Menu className="h-6 w-6 text-[#78716C]" />
          </SidebarTrigger>
        </div>

        {/* Messages Layout: Split View */}
        <div className="flex h-full w-full overflow-hidden">
          {/* Conversation List (Left Panel) */}
          <div className="hidden md:flex w-80 lg:w-96 flex-col border-r border-[#E7E5E4] bg-[#FDFBF7]">
            {/* List Header */}
            <div className="p-5 pb-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-geist text-3xl font-medium tracking-tight text-[#292524]">Meldinger</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={toggleEmptyState}
                    className="flex items-center gap-2 rounded-full border border-[#E7E5E4] bg-white px-4 py-2 text-xs font-medium text-[#78716C] hover:bg-[#F5F5F4] hover:scale-[1.02] active:scale-[0.98] ios-ease"
                    title={showEmptyState ? "Show Data" : "Show Empty State"}
                  >
                    {showEmptyState ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    <span className="hidden xl:inline">{showEmptyState ? 'Vis data' : 'Vis tomt'}</span>
                  </button>
                  <Button 
                    onClick={handleStartNewMessage}
                    className="hidden lg:inline-flex gap-2"
                  >
                    <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                    <span className="hidden lg:inline">Ny melding</span>
                    <span className="lg:hidden">Ny</span>
                  </Button>
                  <Button 
                    onClick={handleStartNewMessage}
                    size="icon"
                    className="lg:hidden h-8 w-8 rounded-full"
                  >
                    <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="relative group mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E] group-focus-within:text-[#292524] transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Søk i meldinger..."
                  className="h-10 w-full rounded-full border border-[#E7E5E4] bg-white pl-10 pr-4 text-sm text-[#292524] placeholder:text-[#A8A29E] focus:border-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#A8A29E] transition-all shadow-sm"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1 p-1 bg-[#F5F5F4] rounded-full mb-2">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-all ${
                    filterTab === 'all'
                      ? 'bg-white text-[#292524] shadow-sm'
                      : 'text-[#78716C] hover:text-[#57534E]'
                  }`}
                >
                  Alle
                </button>
                <button
                  onClick={() => setFilterTab('unread')}
                  className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-all ${
                    filterTab === 'unread'
                      ? 'bg-white text-[#292524] shadow-sm'
                      : 'text-[#78716C] hover:text-[#57534E]'
                  }`}
                >
                  Ulest
                </button>
                <button
                  onClick={() => setFilterTab('archive')}
                  className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-all ${
                    filterTab === 'archive'
                      ? 'bg-white text-[#292524] shadow-sm'
                      : 'text-[#78716C] hover:text-[#57534E]'
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
                  <p className="text-sm font-medium text-[#292524]">Ingen meldinger</p>
                  <p className="text-xs text-[#78716C] mt-1">Ingen meldinger funnet med valgte filter.</p>
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
                      ? 'bg-white border border-[#E7E5E4] shadow-sm'
                      : conversation.isRead
                      ? 'hover:bg-white border border-transparent hover:border-[#E7E5E4] hover:shadow-sm opacity-70 hover:opacity-100'
                      : 'hover:bg-white border border-transparent hover:border-[#E7E5E4] hover:shadow-sm'
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
                      <div className="h-10 w-10 rounded-full bg-[#E7E5E4] flex items-center justify-center text-[#78716C] text-xs font-bold">
                        {conversation.initials}
                      </div>
                    )}
                    {conversation.unreadCount && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#292524] text-[10px] font-bold text-white border-2 border-[#FDFBF7]">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={`text-sm font-medium ${
                          conversation.isRead ? 'text-[#44403C]' : 'text-[#292524]'
                        }`}
                      >
                        {conversation.name}
                      </span>
                      <span
                        className={`text-[10px] ${
                          conversation.isRead ? 'text-[#A8A29E]' : 'text-[#78716C]'
                        }`}
                      >
                        {conversation.timestamp}
                      </span>
                    </div>
                    <p
                      className={`text-xs truncate ${
                        conversation.unreadCount
                          ? 'text-[#292524] font-medium'
                          : activeConversation?.id === conversation.id
                          ? 'text-[#57534E] font-medium'
                          : 'text-[#78716C]'
                      }`}
                    >
                      {conversation.lastMessage}
                    </p>
                  </div>
                  {conversation.unreadCount && (
                    <div className="h-2 w-2 rounded-full bg-[#3B82F6] shrink-0 mt-2" />
                  )}
                  {activeConversation?.id === conversation.id && !isComposing && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-[#292524]" />
                  )}
                </button>
              )))}
            </div>
          </div>

          {/* Chat View (Main Area) */}
          <div className="flex-1 flex flex-col h-full bg-[#FDFBF7] relative">
            
            {/* Composing New Message View */}
            {isComposing ? (
              <div className="flex-1 flex flex-col h-full bg-[#FDFBF7]">
                 <header className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4] bg-[#FDFBF7]/90 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={handleCancelComposition}
                        className="md:hidden text-[#78716C] hover:text-[#292524] mr-1"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <h3 className="text-sm font-semibold text-[#292524]">Ny melding</h3>
                    </div>
                    <button 
                      onClick={handleCancelComposition}
                      className="p-2 text-[#A8A29E] hover:text-[#292524] hover:bg-[#F5F5F4] rounded-full transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                </header>

                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#78716C] ml-1">Til:</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E]" />
                        <input
                          type="text"
                          value={newRecipient}
                          onChange={(e) => setNewRecipient(e.target.value)}
                          placeholder="Søk etter navn eller e-post..."
                          autoFocus
                          className="h-11 w-full rounded-xl border border-[#E7E5E4] bg-white pl-10 pr-4 text-sm text-[#292524] placeholder:text-[#A8A29E] focus:border-[#354F41] focus:outline-none focus:ring-1 focus:ring-[#354F41]/20 transition-all shadow-sm"
                        />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-medium text-[#78716C] ml-1">Melding:</label>
                    <div className="rounded-2xl border border-[#E7E5E4] bg-white p-3 shadow-sm focus-within:ring-1 focus-within:ring-[#354F41]/20 focus-within:border-[#354F41] transition-all">
                        <textarea
                          rows={8}
                          value={newMessageBody}
                          onChange={(e) => setNewMessageBody(e.target.value)}
                          placeholder="Skriv din melding her..."
                          className="w-full resize-none bg-transparent px-1 py-1 text-sm text-[#292524] placeholder:text-[#A8A29E] focus:outline-none custom-scrollbar"
                        />
                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#F5F5F4]">
                           <div className="flex items-center gap-1">
                              <button className="p-2 text-[#A8A29E] hover:text-[#57534E] hover:bg-[#F5F5F4] rounded-lg transition-colors">
                                <Paperclip className="h-4 w-4" />
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-2 text-[#A8A29E] hover:text-[#57534E] hover:bg-[#F5F5F4] rounded-lg transition-colors">
                                    <Smile className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-64 p-2">
                                  <div className="grid grid-cols-6 gap-1">
                                    {['😊', '🙏', '👋', '🧘', '✨', '💚', '🌸', '💪', '🙌', '🌞', '🍵', '🤸'].map(emoji => (
                                      <button
                                        key={emoji}
                                        onClick={() => setNewMessageBody(prev => prev + emoji)}
                                        className="text-xl p-1 hover:bg-[#F5F5F4] rounded transition-colors"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                           </div>
                           <Button 
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
            <header className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4] bg-[#FDFBF7]/90 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <button className="md:hidden text-[#78716C] hover:text-[#292524] mr-1">
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
                            <div className="h-10 w-10 rounded-full bg-[#E7E5E4] flex items-center justify-center text-[#78716C] text-xs font-bold ring-2 ring-white shadow-sm">
                              {activeConversation.initials}
                            </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#292524]">{activeConversation.name}</h3>
                          {/* Removed "Online" status for email/inbox style feel */}
                          <p className="text-xs text-[#78716C]">
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
                <button className="p-2 text-[#A8A29E] hover:text-[#292524] hover:bg-[#F5F5F4] rounded-full transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="cursor-pointer text-[#57534E] focus:text-[#292524] focus:bg-[#F5F5F4]">
                           Marker som ulest
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-[#57534E] focus:text-[#292524] focus:bg-[#F5F5F4]">
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
                    <div className="flex flex-col items-center justify-center h-full text-[#A8A29E]">
                        <p>Velg en samtale for å lese</p>
                    </div>
                  ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-[#A8A29E]">
                        <p>Ingen meldinger i denne samtalen ennå</p>
                      </div>
                  ) : (
                    <>
              {/* Time Separator */}
              <div className="flex justify-center">
                <span className="text-[10px] font-medium text-[#A8A29E] bg-[#F5F5F4] px-3 py-1 rounded-full uppercase tracking-wide">
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
                            <div className="h-8 w-8 rounded-full bg-[#292524] flex items-center justify-center text-[#F5F5F4] text-[10px] font-bold mb-1">
                                Du
                            </div>
                          ) : message.avatar ? (
                  <img
                    src={message.avatar}
                    alt="Avatar"
                              className="h-8 w-8 rounded-full object-cover mb-1 opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-[#E7E5E4] flex items-center justify-center text-[#78716C] text-[10px] font-bold mb-1">
                              {activeConversation.initials}
                            </div>
                          )}

                  <div className={`flex flex-col gap-1 ${message.isOutgoing ? 'items-end' : ''}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-sm ${
                        message.isOutgoing
                          ? 'bg-[#292524] text-[#F5F5F4] rounded-br-sm shadow-md'
                          : 'bg-white border border-[#E7E5E4] rounded-bl-sm'
                      }`}
                    >
                      <p
                        className={`text-sm leading-relaxed ${
                          message.isOutgoing ? 'font-light' : 'text-[#44403C]'
                        }`}
                      >
                        {message.content}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] text-[#A8A29E] flex items-center gap-1 ${
                        message.isOutgoing ? 'pr-1' : 'pl-1'
                      }`}
                    >
                      {message.timestamp}
                      {message.isOutgoing && message.isRead && (
                        <CheckCheck className="h-3 w-3 text-[#10B981]" />
                      )}
                    </span>
                  </div>
                </div>
              ))}
                    </>
                  )}
            </div>

            {/* Input Area */}
            <div className="p-6 pt-2 bg-[#FDFBF7]">
              <div className="flex flex-col gap-2 rounded-2xl border border-[#E7E5E4] bg-white p-2 shadow-sm focus-within:ring-1 focus-within:ring-[#354F41]/20 focus-within:border-[#354F41] transition-all relative">
                <textarea
                  rows={1}
                  placeholder="Skriv en melding..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                      disabled={!activeConversation}
                  className="w-full resize-none bg-transparent px-3 py-2 text-sm text-[#292524] placeholder:text-[#A8A29E] focus:outline-none custom-scrollbar max-h-32 min-h-[44px]"
                />

                    <div className="flex items-center justify-between px-2 pb-1">
                      <div className="flex items-center gap-1">
                        <button
                          className="p-2 text-[#A8A29E] hover:text-[#57534E] hover:bg-[#F5F5F4] rounded-lg transition-colors"
                          title="Legg til fil"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 text-[#A8A29E] hover:text-[#57534E] hover:bg-[#F5F5F4] rounded-lg transition-colors">
                              <Smile className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-64 p-2">
                            <div className="grid grid-cols-6 gap-1">
                              {['😊', '🙏', '👋', '🧘', '✨', '💚', '🌸', '💪', '🙌', '🌞', '🍵', '🤸'].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => setMessageText(prev => prev + emoji)}
                                  className="text-xl p-1 hover:bg-[#F5F5F4] rounded transition-colors"
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
                        className="gap-2"
                      >
                    <span>Send</span>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-[#A8A29E] text-center mt-3">
                Trykk <span className="font-medium text-[#78716C]">Enter</span> for å sende
              </p>
            </div>
              </>
            )}
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
};

export default MessagesPage;
