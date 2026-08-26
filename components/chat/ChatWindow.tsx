"use client";

import React from "react";
import { User, ChatMessage } from "../../lib/types";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { TypingIndicator } from "./TypingIndicator";
import { ChevronLeft, ShieldCheck, Sparkles } from "lucide-react";
import { getAvatarColor, getInitials } from "../../lib/utils";

interface ChatWindowProps {
  currentUser: User;
  recipientUser: User;
  messages: ChatMessage[];
  isTyping: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onBack: () => void;
  onSendMessage: (content: string) => Promise<boolean>;
  onLoadMore: () => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  currentUser,
  recipientUser,
  messages,
  isTyping,
  hasMore,
  isLoadingMore,
  onBack,
  onSendMessage,
  onLoadMore,
  onTypingStart,
  onTypingStop,
}) => {
  const avatarGradient = getAvatarColor(recipientUser.userId || recipientUser.nickname);
  const initials = getInitials(recipientUser.nickname);

  return (
    <div className="h-full flex flex-col bg-[#070b14] overflow-hidden">
      {/* Top Chat Header */}
      <div className="p-3.5 sm:p-4 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Back to users"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Recipient Avatar */}
          <div className="relative shrink-0">
            <div
              className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${avatarGradient} flex items-center justify-center text-white font-bold text-sm shadow-md`}
            >
              {initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900" />
            </span>
          </div>

          {/* Recipient Details */}
          <div className="min-w-0">
            <h2 className="font-bold text-sm sm:text-base text-white truncate">
              {recipientUser.nickname}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active in LAN</span>
            </div>
          </div>
        </div>

        {/* Security & Limit Badge */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-800/70 border border-slate-700/60 rounded-full text-slate-300 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Max 1,000 msgs • TTL 24h</span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <MessageList
        messages={messages}
        currentUserId={currentUser.userId}
        recipientUser={recipientUser}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
      />

      {/* Typing Indicator */}
      {isTyping && <TypingIndicator nickname={recipientUser.nickname} />}

      {/* Message Input Bar */}
      <MessageInput
        onSendMessage={onSendMessage}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
      />
    </div>
  );
};
