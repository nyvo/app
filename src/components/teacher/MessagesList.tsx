import type { Message } from '@/types/dashboard';

interface MessagesListProps {
  messages: Message[];
}

export const MessagesList = ({ messages }: MessagesListProps) => {
  return (
    <div className="col-span-1 md:col-span-3 lg:col-span-2 h-[360px] rounded-3xl border border-[#E7E5E4] bg-white p-0 shadow-sm overflow-hidden ios-ease hover:border-[#D6D3D1] hover:shadow-md flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-[#F5F5F4]">
        <h3 className="font-geist text-sm font-semibold text-[#292524]">Meldinger</h3>
        <button className="text-xs font-medium text-[#A8A29E] hover:text-[#57534E] transition-colors">Se alle</button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {messages.length === 0 ? (
          <div className="relative flex flex-col items-center justify-center h-full text-center px-6 overflow-hidden">
            {/* Soft background decoration */}
            <div className="absolute top-1/3 -translate-y-1/2 h-40 w-40 rounded-full bg-[#F7F5F2] blur-3xl"></div>

            <div className="relative z-10 flex flex-col items-center">
              {/* Zen messaging */}
              <h4 className="font-geist text-sm font-medium text-[#292524] mb-1">
                Ingen meldinger
              </h4>
              <p className="text-xs text-[#78716C] max-w-[200px]">
                Du har ingen nye meldinger
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
          <div
            key={message.id}
            className="group flex items-center gap-3.5 p-3 rounded-2xl hover:bg-[#F7F5F2] cursor-pointer transition-colors"
          >
            <div className="relative flex-shrink-0">
              <img
                src={message.sender.avatar}
                className="h-10 w-10 rounded-full object-cover border border-[#E7E5E4] group-hover:border-[#D6D3D1]"
                alt={message.sender.name}
              />
              {message.isOnline && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#4A6959] ring-2 ring-white"></span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <p className="text-sm font-medium text-[#292524] truncate">
                  {message.sender.name}
                </p>
                <span className="text-[10px] font-medium text-[#A8A29E] flex-shrink-0 ml-1.5 group-hover:text-[#78716C]">
                  {message.timestamp}
                </span>
              </div>
              <p className="text-xs text-[#78716C] truncate group-hover:text-[#57534E]">
                {message.content}
              </p>
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );
};
