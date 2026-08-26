"use client";

import React from "react";
import { User } from "../../lib/types";
import { getAvatarColor, getInitials } from "../../lib/utils";

interface UserItemProps {
  user: User;
  isSelected: boolean;
  unreadCount?: number;
  lastMessagePreview?: string;
  isTyping?: boolean;
  onSelect: (user: User) => void;
}

export const UserItem: React.FC<UserItemProps> = ({
  user,
  isSelected,
  unreadCount = 0,
  lastMessagePreview,
  isTyping = false,
  onSelect,
}) => {
  const avatarGradient = getAvatarColor(user.userId || user.nickname);
  const initials = getInitials(user.nickname);

  return (
    <button
      onClick={() => onSelect(user)}
      className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition-all text-left group ${
        isSelected
          ? "bg-blue-600/15 border border-blue-500/30 text-white shadow-md shadow-blue-500/5"
          : "hover:bg-slate-800/60 border border-transparent text-slate-200"
      }`}
    >
      {/* Avatar Container */}
      <div className="relative shrink-0">
        <div
          className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${avatarGradient} flex items-center justify-center text-white font-bold text-sm shadow-md`}
        >
          {initials}
        </div>
        {/* Live Green Online Badge */}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900 shadow-sm" />
        </span>
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-semibold text-sm truncate text-white group-hover:text-blue-300 transition-colors">
            {user.nickname}
          </span>
          {unreadCount > 0 && (
            <span className="shrink-0 px-2 py-0.5 bg-blue-500 text-white text-[11px] font-bold rounded-full animate-pulse-slow">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 truncate mt-0.5">
          {isTyping ? (
            <span className="text-blue-400 font-medium italic animate-pulse">Typing...</span>
          ) : lastMessagePreview ? (
            lastMessagePreview
          ) : (
            <span className="text-slate-500">Online on Wi-Fi</span>
          )}
        </p>
      </div>
    </button>
  );
};
