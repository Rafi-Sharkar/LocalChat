"use client";

import React from "react";

interface TypingIndicatorProps {
  nickname: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ nickname }) => {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-slate-400 animate-fade-in">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
      </div>
      <span className="italic text-blue-300 font-medium">{nickname} is typing...</span>
    </div>
  );
};
