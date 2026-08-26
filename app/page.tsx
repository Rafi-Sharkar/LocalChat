"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { User, ChatMessage, MessageHistoryResponse } from "../lib/types";
import { getClientSocket, disconnectClientSocket } from "../lib/socket";
import { getConversationId } from "../lib/utils";
import { JoinScreen } from "../components/join/JoinScreen";
import { UserList } from "../components/users/UserList";
import { ChatWindow } from "../components/chat/ChatWindow";
import { QrCodeModal } from "../components/common/QrCodeModal";
import { NicknameModal } from "../components/common/NicknameModal";
import { ConnectionBanner } from "../components/common/ConnectionBanner";
import { MessageSquare, Wifi, Users, Sparkles } from "lucide-react";

const SESSION_KEY = "lan_chat_session";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Messages map: conversationId -> ChatMessage[]
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({});
  const [hasMoreMap, setHasMoreMap] = useState<Record<string, boolean>>({});
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});

  const [lanUrl, setLanUrl] = useState("http://localhost:3000");
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "reconnecting" | "disconnected"
  >("disconnected");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  // Keep a ref to active selectedUser & currentUser to access in socket event handlers
  const selectedUserRef = useRef<User | null>(null);
  selectedUserRef.current = selectedUser;
  const currentUserRef = useRef<User | null>(null);
  currentUserRef.current = currentUser;

  // 1. Fetch dynamic LAN IP info on mount
  useEffect(() => {
    fetch("/api/lan-info")
      .then((res) => res.json())
      .then((data) => {
        if (data.fullUrl) {
          setLanUrl(data.fullUrl);
        } else if (typeof window !== "undefined") {
          setLanUrl(window.location.origin);
        }
      })
      .catch(() => {
        if (typeof window !== "undefined") {
          setLanUrl(window.location.origin);
        }
      });
  }, []);

  // 2. Setup Socket.IO connection and handlers
  useEffect(() => {
    const socket = getClientSocket();

    const onConnect = () => {
      setConnectionStatus("connected");
      setConnectionError(null);

      // Check for saved temporary session in sessionStorage
      const savedSession = sessionStorage.getItem(SESSION_KEY);
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (parsed.nickname && parsed.userId) {
            socket.emit(
              "user:join",
              { nickname: parsed.nickname, existingUserId: parsed.userId },
              (res) => {
                if (res?.success && res.data) {
                  setCurrentUser(res.data.user);
                  setOnlineUsers(res.data.onlineUsers);
                  if (res.data.lanIp && res.data.port) {
                    setLanUrl(`http://${res.data.lanIp}:${res.data.port}`);
                  }
                } else {
                  sessionStorage.removeItem(SESSION_KEY);
                }
              }
            );
          }
        } catch {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
    };

    const onDisconnect = () => {
      setConnectionStatus("disconnected");
    };

    const onConnectError = (err: Error) => {
      console.warn("[Socket Connect Error]", err.message);
      setConnectionStatus("reconnecting");
    };

    const onUserJoined = (user: User) => {
      setOnlineUsers((prev) => {
        const filtered = prev.filter((u) => u.userId !== user.userId);
        return [...filtered, user].sort((a, b) => a.nickname.localeCompare(b.nickname));
      });
    };

    const onUserLeft = (data: { userId: string; nickname: string }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      if (selectedUserRef.current?.userId === data.userId) {
        // Recipient left
        setTypingMap((prev) => ({ ...prev, [data.userId]: false }));
      }
    };

    const onUsersList = (users: User[]) => {
      setOnlineUsers(users);
    };

    const onUserNicknameChanged = (data: { userId: string; oldNickname: string; newNickname: string }) => {
      setOnlineUsers((prev) =>
        prev.map((u) => (u.userId === data.userId ? { ...u, nickname: data.newNickname } : u))
      );
      if (selectedUserRef.current?.userId === data.userId) {
        setSelectedUser((prev) => (prev ? { ...prev, nickname: data.newNickname } : null));
      }
    };

    const onChatMessage = (message: ChatMessage) => {
      const convId = message.conversationId;
      setConversations((prev) => {
        const existing = prev[convId] || [];
        // Avoid duplicate message appending
        if (existing.some((m) => m.id === message.id)) return prev;
        return {
          ...prev,
          [convId]: [...existing, message],
        };
      });

      // Update unread count if message is not from self and not in active conversation
      const currentSelected = selectedUserRef.current;
      const myUserId = currentUserRef.current?.userId;
      const isCurrentChat =
        currentSelected &&
        getConversationId(message.senderId, currentSelected.userId) === convId;

      if (!isCurrentChat && message.senderId !== myUserId) {
        setUnreadMap((prev) => ({
          ...prev,
          [message.senderId]: (prev[message.senderId] || 0) + 1,
        }));
      } else if (isCurrentChat && myUserId) {
        // Automatically mark message as read
        socket.emit("message:read", {
          conversationId: convId,
          messageIds: [message.id],
          readerId: myUserId,
        });
      }
    };

    const onTypingStart = (data: { senderId: string; conversationId: string }) => {
      setTypingMap((prev) => ({ ...prev, [data.senderId]: true }));
    };

    const onTypingStop = (data: { senderId: string; conversationId: string }) => {
      setTypingMap((prev) => ({ ...prev, [data.senderId]: false }));
    };

    const onMessageRead = (data: { conversationId: string; messageIds: string[] }) => {
      setConversations((prev) => {
        const list = prev[data.conversationId];
        if (!list) return prev;
        return {
          ...prev,
          [data.conversationId]: list.map((msg) =>
            data.messageIds.includes(msg.id) ? { ...msg, status: "read" } : msg
          ),
        };
      });
    };

    const onChatError = (error: { code: string; message: string }) => {
      setConnectionError(error.message);
      setTimeout(() => setConnectionError(null), 5000);
    };

    const onSessionExpired = () => {
      sessionStorage.removeItem(SESSION_KEY);
      setCurrentUser(null);
      setSelectedUser(null);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("user:joined", onUserJoined);
    socket.on("user:left", onUserLeft);
    socket.on("users:list", onUsersList);
    socket.on("user:nickname_changed", onUserNicknameChanged);
    socket.on("chat:message", onChatMessage);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("message:read", onMessageRead);
    socket.on("chat:error", onChatError);
    socket.on("session:expired", onSessionExpired);

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("user:joined", onUserJoined);
      socket.off("user:left", onUserLeft);
      socket.off("users:list", onUsersList);
      socket.off("user:nickname_changed", onUserNicknameChanged);
      socket.off("chat:message", onChatMessage);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("message:read", onMessageRead);
      socket.off("chat:error", onChatError);
      socket.off("session:expired", onSessionExpired);
    };
  }, []);

  // 3. Heartbeat loop (every 20s)
  useEffect(() => {
    if (!currentUser) return;
    const socket = getClientSocket();
    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit("user:heartbeat");
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // 4. Join handler
  const handleJoin = async (nickname: string): Promise<{ success: boolean; error?: string }> => {
    const socket = getClientSocket();
    if (!socket.connected) {
      socket.connect();
    }

    return new Promise((resolve) => {
      socket.emit("user:join", { nickname }, (res) => {
        if (res?.success && res.data) {
          setCurrentUser(res.data.user);
          setOnlineUsers(res.data.onlineUsers);
          if (res.data.lanIp && res.data.port) {
            setLanUrl(`http://${res.data.lanIp}:${res.data.port}`);
          }
          sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({
              userId: res.data.user.userId,
              nickname: res.data.user.nickname,
            })
          );
          resolve({ success: true });
        } else {
          resolve({ success: false, error: res?.error?.message || "Could not join chat." });
        }
      });
    });
  };

  // 5. Select user & load conversation history
  const handleSelectUser = useCallback(
    (user: User) => {
      if (!currentUser) return;
      setSelectedUser(user);

      // Clear unread count
      setUnreadMap((prev) => ({ ...prev, [user.userId]: 0 }));

      const convId = getConversationId(currentUser.userId, user.userId);
      const socket = getClientSocket();

      // Fetch latest 50 messages if not loaded yet
      if (!conversations[convId]) {
        socket.emit("chat:history", { conversationId: convId, offset: 0, limit: 50 }, (res) => {
          if (res?.success && res.data) {
            setConversations((prev) => ({
              ...prev,
              [convId]: res.data!.messages,
            }));
            setHasMoreMap((prev) => ({
              ...prev,
              [convId]: res.data!.hasMore,
            }));
          }
        });
      }
    },
    [currentUser, conversations]
  );

  // 6. Load more history (pagination)
  const handleLoadMore = useCallback(() => {
    if (!currentUser || !selectedUser || isLoadingMore) return;
    const convId = getConversationId(currentUser.userId, selectedUser.userId);
    const existingMessages = conversations[convId] || [];
    const socket = getClientSocket();

    setIsLoadingMore(true);
    socket.emit(
      "chat:history",
      {
        conversationId: convId,
        offset: existingMessages.length,
        limit: 50,
      },
      (res) => {
        setIsLoadingMore(false);
        if (res?.success && res.data) {
          setConversations((prev) => ({
            ...prev,
            [convId]: [...res.data!.messages, ...(prev[convId] || [])],
          }));
          setHasMoreMap((prev) => ({
            ...prev,
            [convId]: res.data!.hasMore,
          }));
        }
      }
    );
  }, [currentUser, selectedUser, isLoadingMore, conversations]);

  // 7. Send message handler
  const handleSendMessage = async (content: string): Promise<boolean> => {
    if (!currentUser || !selectedUser) return false;
    const socket = getClientSocket();

    return new Promise((resolve) => {
      socket.emit(
        "chat:send",
        {
          recipientId: selectedUser.userId,
          content,
        },
        (res) => {
          if (res?.success) {
            resolve(true);
          } else {
            if (res?.error) {
              setConnectionError(res.error.message);
              setTimeout(() => setConnectionError(null), 4000);
            }
            resolve(false);
          }
        }
      );
    });
  };

  // 8. Typing handlers
  const handleTypingStart = () => {
    if (!currentUser || !selectedUser) return;
    const convId = getConversationId(currentUser.userId, selectedUser.userId);
    getClientSocket().emit("typing:start", {
      recipientId: selectedUser.userId,
      conversationId: convId,
    });
  };

  const handleTypingStop = () => {
    if (!currentUser || !selectedUser) return;
    const convId = getConversationId(currentUser.userId, selectedUser.userId);
    getClientSocket().emit("typing:stop", {
      recipientId: selectedUser.userId,
      conversationId: convId,
    });
  };

  // 9. Nickname update handler
  const handleUpdateNickname = async (
    newNickname: string
  ): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      getClientSocket().emit("user:change_nickname", { newNickname }, (res) => {
        if (res?.success && res.data) {
          setCurrentUser((prev) => (prev ? { ...prev, nickname: res.data!.newNickname } : null));
          const saved = sessionStorage.getItem(SESSION_KEY);
          if (saved) {
            try {
              const p = JSON.parse(saved);
              sessionStorage.setItem(
                SESSION_KEY,
                JSON.stringify({ ...p, nickname: res.data.newNickname })
              );
            } catch {
              // Ignored
            }
          }
          resolve({ success: true });
        } else {
          resolve({ success: false, error: res?.error?.message || "Failed to change nickname." });
        }
      });
    });
  };

  // 10. Leave handler
  const handleLeave = () => {
    sessionStorage.removeItem(SESSION_KEY);
    getClientSocket().emit("user:leave");
    setCurrentUser(null);
    setSelectedUser(null);
  };

  // If not joined yet, render JoinScreen
  if (!currentUser) {
    return (
      <JoinScreen
        onJoin={handleJoin}
        isConnecting={connectionStatus === "connecting"}
        lanUrl={lanUrl}
      />
    );
  }

  const activeConversationId = selectedUser
    ? getConversationId(currentUser.userId, selectedUser.userId)
    : "";
  const activeMessages = activeConversationId ? conversations[activeConversationId] || [] : [];
  const activeHasMore = activeConversationId ? hasMoreMap[activeConversationId] || false : false;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#070b14] overflow-hidden">
      {/* Top Banner for connection status or errors */}
      <ConnectionBanner
        status={connectionStatus}
        errorMessage={connectionError}
        onRetry={() => getClientSocket().connect()}
      />

      {/* Main Responsive Grid Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar / User List (Hidden on mobile if chat is open) */}
        <aside
          className={`w-full md:w-80 lg:w-96 shrink-0 h-full ${
            selectedUser ? "hidden md:flex flex-col" : "flex flex-col"
          }`}
        >
          <UserList
            currentUser={currentUser}
            users={onlineUsers}
            selectedUser={selectedUser}
            unreadMap={unreadMap}
            typingUsers={typingMap}
            lanUrl={lanUrl}
            onSelectUser={handleSelectUser}
            onOpenNicknameModal={() => setShowNicknameModal(true)}
            onOpenQrModal={() => setShowQrModal(true)}
            onLeave={handleLeave}
          />
        </aside>

        {/* Right Active Chat Pane (Visible on mobile when user selected) */}
        <main
          className={`flex-1 h-full bg-[#070b14] ${
            selectedUser ? "flex flex-col" : "hidden md:flex flex-col"
          }`}
        >
          {selectedUser ? (
            <ChatWindow
              currentUser={currentUser}
              recipientUser={selectedUser}
              messages={activeMessages}
              isTyping={typingMap[selectedUser.userId] || false}
              hasMore={activeHasMore}
              isLoadingMore={isLoadingMore}
              onBack={() => setSelectedUser(null)}
              onSendMessage={handleSendMessage}
              onLoadMore={handleLoadMore}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
            />
          ) : (
            /* Desktop Empty State when no conversation selected */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none bg-slate-950/30">
              <div className="relative p-6 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl glass-panel max-w-sm">
                <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-400 rounded-2xl flex items-center justify-center">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">Temporary LAN Chat</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Select an online user on the left sidebar to start a real-time private conversation.
                </p>
                <div className="mt-5 flex items-center justify-center gap-2 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
                  <Wifi className="w-3.5 h-3.5 text-blue-400" />
                  <span>Wi-Fi Network Private Messaging</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <QrCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        lanUrl={lanUrl}
      />

      <NicknameModal
        isOpen={showNicknameModal}
        currentNickname={currentUser.nickname}
        onClose={() => setShowNicknameModal(false)}
        onUpdateNickname={handleUpdateNickname}
      />
    </div>
  );
}
