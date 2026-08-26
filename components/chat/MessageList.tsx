"use client";

import React, { useRef, useEffect } from "react";
import { ChatMessage, User } from "../../lib/types";
import { formatMessageTime } from "../../lib/utils";
import { Check, CheckCheck, Loader2, Sparkles } from "lucide-react";

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  recipientUser: User;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  recipientUser,
  hasMore,
  isLoadingMore,
  onLoadMore,
}) => {
  const scrollBottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // Auto-scroll to bottom on new incoming messages
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 select-text"
    >
      {/* Load earlier messages button */}
      {hasMore && (
        <div className="flex justify-center pb-2">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-full text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Loading earlier messages...</span>
              </>
            ) : (
              <span>Load earlier messages</span>
            )}
          </button>
        </div>
      )}

      {/* Empty State */}
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
          <div className="p-4 bg-slate-800/40 rounded-3xl border border-slate-800 mb-4 shadow-inner">
            <span className="text-3xl">👋</span>
          </div>
          <h4 className="text-base font-bold text-white">
            Say hello to {recipientUser.nickname}
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            This is a temporary private conversation. Up to 1,000 messages are kept and automatically cleaned up after 24h.
          </p>
        </div>
      )}

      {/* Messages */}
      {messages.map((msg, index) => {
        const isMe = msg.senderId === currentUserId;
        const showDateSeparator =
          index === 0 ||
          new Date(msg.timestamp).toDateString() !==
            new Date(messages[index - 1].timestamp).toDateString();

        return (
          <React.Fragment key={msg.id || index}>
            {showDateSeparator && (
              <div className="flex justify-center my-4 select-none">
                <span className="px-3 py-1 bg-slate-800/50 border border-slate-800 text-[11px] font-medium text-slate-400 rounded-full">
                  {new Date(msg.timestamp).toLocaleDateString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}

            <div
              className={`flex flex-col ${
                isMe ? "items-end" : "items-start"
              } animate-fade-in`}
            >
              <div
                className={`relative max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl shadow-md break-words ${
                  isMe
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-xs"
                    : "bg-slate-800/90 border border-slate-700/60 text-slate-100 rounded-bl-xs"
                }`}
              >
                {/* Text Content - strictly rendered as text, preventing XSS */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap select-text">
                  {msg.content}
                </p>

                {/* Footer with time and read receipt status */}
                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
                    isMe ? "text-blue-200" : "text-slate-400"
                  }`}
                >
                  <span>{formatMessageTime(msg.timestamp)}</span>
                  {isMe && (
                    <span className="ml-0.5 inline-flex items-center">
                      {msg.status === "read" ? (
                        <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-blue-200" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}

      <div ref={scrollBottomRef} />
    </div>
  );
};
