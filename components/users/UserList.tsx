"use client";

import React, { useState, useMemo } from "react";
import { User } from "../../lib/types";
import { UserItem } from "./UserItem";
import { Search, QrCode, Edit2, LogOut, Users, Wifi, Sparkles } from "lucide-react";
import { getAvatarColor, getInitials } from "../../lib/utils";

interface UserListProps {
  currentUser: User;
  users: User[];
  selectedUser: User | null;
  unreadMap: Record<string, number>;
  typingUsers: Record<string, boolean>;
  lanUrl: string;
  onSelectUser: (user: User) => void;
  onOpenNicknameModal: () => void;
  onOpenQrModal: () => void;
  onLeave: () => void;
}

export const UserList: React.FC<UserListProps> = ({
  currentUser,
  users,
  selectedUser,
  unreadMap,
  typingUsers,
  lanUrl,
  onSelectUser,
  onOpenNicknameModal,
  onOpenQrModal,
  onLeave,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter out self and apply search
  const filteredUsers = useMemo(() => {
    const otherUsers = users.filter((u) => u.userId !== currentUser.userId);
    if (!searchQuery.trim()) return otherUsers;

    const q = searchQuery.toLowerCase().trim();
    return otherUsers.filter((u) => u.nickname.toLowerCase().includes(q));
  }, [users, currentUser.userId, searchQuery]);

  const currentAvatarGradient = getAvatarColor(currentUser.userId || currentUser.nickname);
  const currentInitials = getInitials(currentUser.nickname);

  return (
    <div className="h-full flex flex-col bg-slate-900/95 border-r border-slate-800/80 select-none">
      {/* Top Profile & Actions Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between gap-2">
          {/* User badge */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${currentAvatarGradient} flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0`}
            >
              {currentInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white truncate">
                  {currentUser.nickname}
                </span>
                <button
                  onClick={onOpenNicknameModal}
                  title="Change temporary nickname"
                  className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Online (You)</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onOpenQrModal}
              title="Share LAN QR Code"
              className="p-2 text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700/80 rounded-xl transition-all border border-slate-700/50"
            >
              <QrCode className="w-4 h-4 text-blue-400" />
            </button>
            <button
              onClick={onLeave}
              title="Leave Chat"
              className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800/70 hover:bg-rose-950/40 rounded-xl transition-all border border-slate-700/50"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Field */}
      <div className="p-3.5 border-b border-slate-800/60">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search online users..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-950/70 border border-slate-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Online Users Count Label */}
      <div className="px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 font-medium tracking-wide">
        <div className="flex items-center gap-1.5 uppercase text-[11px] font-semibold text-slate-400">
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span>Online Users — {filteredUsers.length + 1}</span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">LAN</span>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <UserItem
              key={user.userId}
              user={user}
              isSelected={selectedUser?.userId === user.userId}
              unreadCount={unreadMap[user.userId] || 0}
              isTyping={typingUsers[user.userId] || false}
              onSelect={onSelectUser}
            />
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800 text-slate-400 mb-3">
              <Wifi className="w-8 h-8 text-blue-400 animate-pulse-slow" />
            </div>
            {searchQuery ? (
              <>
                <p className="text-sm font-semibold text-white">No users found</p>
                <p className="text-xs text-slate-500 mt-1">
                  No online user matching &ldquo;{searchQuery}&rdquo;
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white">No one else is online</p>
                <p className="text-xs text-slate-400 mt-1.5 max-w-[200px] leading-relaxed">
                  Share this LAN address with someone connected to the same Wi-Fi network.
                </p>
                <button
                  onClick={onOpenQrModal}
                  className="mt-4 flex items-center gap-2 px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Show QR Code</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom LAN Status bar */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 truncate">
          <Sparkles className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="truncate">Temporary Redis Session</span>
        </div>
        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 shrink-0">
          TTL 24h
        </span>
      </div>
    </div>
  );
};
