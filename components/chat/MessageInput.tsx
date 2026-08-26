"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Smile } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<boolean>;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled = false,
}) => {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const MAX_LENGTH = 2000;

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 140)}px`;
    }
  }, [content]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_LENGTH) {
      setContent(val);
    }

    // Trigger typing event with debounce
    onTypingStart();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop();
    }, 1500);
  };

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending || disabled) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      onTypingStop();
    }

    setIsSending(true);
    const success = await onSendMessage(trimmed);
    setIsSending(false);

    if (success) {
      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-slate-800/80">
      <div className="relative flex items-end gap-2 p-1.5 bg-slate-950/80 border border-slate-700/70 focus-within:border-blue-500/80 rounded-2xl transition-all shadow-inner">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Press Enter to send)"
          rows={1}
          disabled={disabled}
          maxLength={MAX_LENGTH}
          className="flex-1 max-h-[140px] px-3.5 py-2.5 bg-transparent text-sm text-white placeholder-slate-500 resize-none outline-none leading-relaxed"
        />

        <div className="flex items-center gap-1.5 pb-1 pr-1 shrink-0">
          {content.length > 1500 && (
            <span className="text-[10px] text-slate-500 font-mono pr-1">
              {MAX_LENGTH - content.length}
            </span>
          )}

          <button
            type="button"
            onClick={handleSend}
            disabled={!content.trim() || isSending || disabled}
            aria-label="Send Message"
            className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
