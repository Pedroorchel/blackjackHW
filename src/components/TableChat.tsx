import React, { useState, useRef, useEffect } from 'react';
import { TableChatMessage } from '../types';
import { MessageSquare, Send, X, ChevronUp, ChevronDown } from 'lucide-react';

interface TableChatProps {
  messages: TableChatMessage[];
  onSendMessage: (text: string) => void;
}

const QUICK_REACTIONS = ['Boa sorte!', 'GG!', '21!', 'Quase!', 'Dobrou!', 'Parabéns!'];

export const TableChat: React.FC<TableChatProps> = ({ messages, onSendMessage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSendMessage(inputVal.trim());
      setInputVal('');
    }
  };

  const handleQuickReaction = (text: string) => {
    onSendMessage(text);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {!isOpen ? (
        <button
          type="button"
          id="btn-open-chat"
          onClick={() => setIsOpen(true)}
          className="bg-black/60 hover:bg-black/80 border border-white/10 text-yellow-500 p-3 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-xs font-bold hidden sm:inline text-white/80">Table Chat</span>
          {messages.length > 0 && (
            <span className="bg-yellow-500 text-black text-[10px] font-black rounded-full px-1.5 py-0.2">
              {messages.length}
            </span>
          )}
        </button>
      ) : (
        <div
          id="chat-drawer"
          className="w-80 sm:w-88 h-96 bg-black/80 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-3 bg-black/40 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-yellow-500" />
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">
                Table Chat
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white/40 hover:text-white p-1 rounded cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`${
                  msg.isSystem
                    ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 p-1.5 rounded text-[11px]'
                    : 'bg-white/5 p-2 rounded border border-white/5'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-white/40 mb-0.5">
                  <span className={`font-semibold ${msg.isSystem ? 'text-yellow-400' : 'text-white/60'}`}>
                    {msg.senderName}:
                  </span>
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-white/90 break-words">{msg.text}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick reactions */}
          <div className="px-2 py-1.5 bg-black/40 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_REACTIONS.map(reaction => (
              <button
                key={reaction}
                type="button"
                onClick={() => handleQuickReaction(reaction)}
                className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/70 border border-white/5 transition-colors cursor-pointer"
              >
                {reaction}
              </button>
            ))}
          </div>

          {/* Input field */}
          <form onSubmit={handleSubmit} className="p-2 bg-black/40 border-t border-white/10 flex gap-2">
            <input
              id="input-chat-text"
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Say something..."
              maxLength={120}
              className="flex-1 bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-yellow-500"
            />
            <button
              type="submit"
              id="btn-send-chat"
              className="bg-yellow-600 hover:bg-yellow-500 text-black p-2 rounded cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
