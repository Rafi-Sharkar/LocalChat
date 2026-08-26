import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import Redis from "ioredis";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  JoinPayload,
  SendMessagePayload,
  MessageHistoryPayload,
  TypingPayload,
  MessageReadPayload,
  NicknameChangePayload,
} from "../lib/types";
import { validateNickname, validateMessageContent, sanitizeText } from "./validation";
import {
  registerUser,
  refreshUserPresence,
  removeUser,
  getUserBySocketId,
  getUserById,
  changeUserNickname,
  getOnlineUsers,
} from "./presence";
import { saveMessage, getMessageHistory, markMessagesAsRead } from "./chat";
import { checkRateLimit } from "./rateLimit";
import { getConversationId } from "../lib/utils";

const MESSAGE_RATE_LIMIT = parseInt(process.env.MESSAGE_RATE_LIMIT || "20", 10);
const MESSAGE_RATE_WINDOW = parseInt(process.env.MESSAGE_RATE_WINDOW_SECONDS || "10", 10);
const JOIN_RATE_LIMIT = parseInt(process.env.JOIN_RATE_LIMIT || "5", 10);
const JOIN_RATE_WINDOW = parseInt(process.env.JOIN_RATE_WINDOW_SECONDS || "60", 10);
const NICK_RATE_LIMIT = parseInt(process.env.NICKNAME_CHANGE_RATE_LIMIT || "5", 10);
const NICK_RATE_WINDOW = parseInt(process.env.NICKNAME_CHANGE_WINDOW_SECONDS || "60", 10);

export function initializeSocketServer(
  httpServer: HttpServer,
  redis: Redis,
  lanIp?: string,
  port?: number
): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
      pingTimeout: 20000,
      pingInterval: 10000,
    }
  );

  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
    const clientIp = socket.handshake.address || "unknown";

    // 1. User Join / Reconnect
    socket.on("user:join", async (payload: JoinPayload, callback) => {
      try {
        // Rate limit join attempts per IP
        const rateCheck = await checkRateLimit(redis, {
          key: `join_ip:${clientIp}`,
          limit: JOIN_RATE_LIMIT,
          windowSeconds: JOIN_RATE_WINDOW,
        });

        if (!rateCheck.allowed) {
          const err = {
            code: "RATE_LIMITED",
            message: `Too many join attempts. Please wait ${rateCheck.retryAfterSeconds}s.`,
          };
          socket.emit("chat:error", err);
          callback?.({ success: false, error: err });
          return;
        }

        const validNick = validateNickname(payload.nickname);
        if (!validNick.success) {
          const err = { code: "INVALID_NICKNAME", message: validNick.error, field: "nickname" };
          socket.emit("chat:error", err);
          callback?.({ success: false, error: err });
          return;
        }

        const cleanNickname = sanitizeText(validNick.data);
        const joinResult = await registerUser(
          redis,
          cleanNickname,
          socket.id,
          payload.existingUserId
        );

        if (!joinResult.success) {
          const err = { code: "NICKNAME_TAKEN", message: joinResult.error, field: "nickname" };
          socket.emit("chat:error", err);
          callback?.({ success: false, error: err });
          return;
        }

        const user = joinResult.user;
        socket.data.userId = user.userId;
        socket.data.nickname = user.nickname;
        socket.data.joinedAt = user.joinedAt;

        // Join individual user room for direct targeting
        socket.join(`user:${user.userId}`);

        const onlineUsers = await getOnlineUsers(redis);

        const responseData = {
          user,
          onlineUsers,
          lanIp,
          port,
        };

        callback?.({ success: true, data: responseData });

        // Broadcast to all other users
        socket.broadcast.emit("user:joined", user);
        io.emit("users:list", onlineUsers);
      } catch (err) {
        console.error("[Socket join error]", err);
        const error = { code: "SERVER_ERROR", message: "Failed to join chat session." };
        socket.emit("chat:error", error);
        callback?.({ success: false, error });
      }
    });

    // 2. Heartbeat Presence
    socket.on("user:heartbeat", async () => {
      const userId = socket.data.userId;
      if (!userId) return;

      try {
        const refreshed = await refreshUserPresence(redis, userId, socket.id);
        if (!refreshed) {
          socket.emit("session:expired", { message: "Your session has expired. Please rejoin." });
        }
      } catch (err) {
        console.error("[Socket heartbeat error]", err);
      }
    });

    // 3. Change Nickname
    socket.on("user:change_nickname", async (payload: NicknameChangePayload, callback) => {
      const userId = socket.data.userId;
      if (!userId) {
        const err = { code: "UNAUTHORIZED", message: "You must join before changing nickname." };
        callback?.({ success: false, error: err });
        return;
      }

      try {
        const rate = await checkRateLimit(redis, {
          key: `nick_user:${userId}`,
          limit: NICK_RATE_LIMIT,
          windowSeconds: NICK_RATE_WINDOW,
        });

        if (!rate.allowed) {
          const err = {
            code: "RATE_LIMITED",
            message: `Nickname change limit reached. Retry in ${rate.retryAfterSeconds}s.`,
          };
          callback?.({ success: false, error: err });
          return;
        }

        const validNick = validateNickname(payload.newNickname);
        if (!validNick.success) {
          const err = { code: "INVALID_NICKNAME", message: validNick.error, field: "newNickname" };
          callback?.({ success: false, error: err });
          return;
        }

        const cleanName = sanitizeText(validNick.data);
        const changeResult = await changeUserNickname(redis, userId, cleanName);

        if (!changeResult.success) {
          const err = { code: "NICKNAME_TAKEN", message: changeResult.error };
          callback?.({ success: false, error: err });
          return;
        }

        socket.data.nickname = cleanName;
        const resPayload = {
          userId,
          oldNickname: changeResult.oldNickname,
          newNickname: cleanName,
        };

        callback?.({ success: true, data: resPayload });
        io.emit("user:nickname_changed", resPayload);

        const onlineUsers = await getOnlineUsers(redis);
        io.emit("users:list", onlineUsers);
      } catch (err) {
        console.error("[Socket change nickname error]", err);
        const errPayload = { code: "SERVER_ERROR", message: "Failed to change nickname." };
        callback?.({ success: false, error: errPayload });
      }
    });

    // 4. Send Private Chat Message
    socket.on("chat:send", async (payload: SendMessagePayload, callback) => {
      const senderId = socket.data.userId;
      const senderNickname = socket.data.nickname;

      if (!senderId || !senderNickname) {
        const err = { code: "UNAUTHORIZED", message: "Active session required to send messages." };
        socket.emit("chat:error", err);
        callback?.({ success: false, error: err });
        return;
      }

      try {
        // Message rate limiting
        const rateCheck = await checkRateLimit(redis, {
          key: `msg_user:${senderId}`,
          limit: MESSAGE_RATE_LIMIT,
          windowSeconds: MESSAGE_RATE_WINDOW,
        });

        if (!rateCheck.allowed) {
          const err = {
            code: "RATE_LIMITED",
            message: `Message rate limit reached. Slow down! (${rateCheck.retryAfterSeconds}s)`,
          };
          socket.emit("chat:error", err);
          callback?.({ success: false, error: err });
          return;
        }

        const validContent = validateMessageContent(payload.content);
        if (!validContent.success) {
          const err = { code: "INVALID_MESSAGE", message: validContent.error };
          socket.emit("chat:error", err);
          callback?.({ success: false, error: err });
          return;
        }

        const recipientId = payload.recipientId;
        if (!recipientId || recipientId === senderId) {
          const err = { code: "INVALID_RECIPIENT", message: "Invalid recipient selected." };
          socket.emit("chat:error", err);
          callback?.({ success: false, error: err });
          return;
        }

        // Check if recipient exists / is online
        const recipient = await getUserById(redis, recipientId);
        if (!recipient) {
          const err = {
            code: "RECIPIENT_OFFLINE",
            message: "The user you are trying to message is no longer online.",
          };
          socket.emit("chat:error", err);
          callback?.({ success: false, error: err });
          return;
        }

        const cleanContent = sanitizeText(validContent.data);
        const conversationId = getConversationId(senderId, recipientId);

        const message = await saveMessage(
          redis,
          conversationId,
          senderId,
          senderNickname,
          cleanContent
        );

        // Ensure both sockets are in the conversation room
        socket.join(`conversation:${conversationId}`);

        // Emit to sender socket acknowledgment
        callback?.({ success: true, data: message });

        // Emit message to conversation room and to recipient user room
        io.to(`conversation:${conversationId}`).emit("chat:message", message);
        io.to(`user:${recipientId}`).emit("chat:message", message);
      } catch (err) {
        console.error("[Socket chat send error]", err);
        const errPayload = { code: "SERVER_ERROR", message: "Failed to send message." };
        socket.emit("chat:error", errPayload);
        callback?.({ success: false, error: errPayload });
      }
    });

    // 5. Chat History
    socket.on("chat:history", async (payload: MessageHistoryPayload, callback) => {
      const userId = socket.data.userId;
      if (!userId) {
        const err = { code: "UNAUTHORIZED", message: "Session required." };
        callback?.({ success: false, error: err });
        return;
      }

      try {
        const { conversationId, offset = 0, limit = 50 } = payload;
        
        // Security check: verify this user is part of the conversation ID
        const parts = conversationId.split(":");
        if (!parts.includes(userId)) {
          const err = { code: "FORBIDDEN", message: "You are not a participant in this conversation." };
          callback?.({ success: false, error: err });
          return;
        }

        socket.join(`conversation:${conversationId}`);

        const history = await getMessageHistory(redis, conversationId, offset, limit);
        callback?.({ success: true, data: history });
        socket.emit("chat:history", history);
      } catch (err) {
        console.error("[Socket chat history error]", err);
        const errPayload = { code: "SERVER_ERROR", message: "Failed to fetch chat history." };
        callback?.({ success: false, error: errPayload });
      }
    });

    // 6. Typing Indicators
    socket.on("typing:start", (payload: TypingPayload) => {
      const senderId = socket.data.userId;
      const senderNickname = socket.data.nickname;
      if (!senderId || !senderNickname) return;

      socket.to(`user:${payload.recipientId}`).emit("typing:start", {
        senderId,
        senderNickname,
        conversationId: payload.conversationId,
      });
    });

    socket.on("typing:stop", (payload: TypingPayload) => {
      const senderId = socket.data.userId;
      if (!senderId) return;

      socket.to(`user:${payload.recipientId}`).emit("typing:stop", {
        senderId,
        conversationId: payload.conversationId,
      });
    });

    // 7. Message Read Receipt
    socket.on("message:read", async (payload: MessageReadPayload) => {
      const readerId = socket.data.userId;
      if (!readerId) return;

      try {
        await markMessagesAsRead(redis, payload.conversationId, payload.messageIds, readerId);
        io.to(`conversation:${payload.conversationId}`).emit("message:read", {
          conversationId: payload.conversationId,
          messageIds: payload.messageIds,
          readerId,
        });
      } catch (err) {
        console.error("[Socket message read error]", err);
      }
    });

    // 8. Explicit User Leave
    socket.on("user:leave", async () => {
      const userId = socket.data.userId;
      if (!userId) return;

      try {
        const { user } = await removeUser(redis, userId, socket.id);
        socket.leave(`user:${userId}`);
        socket.data.userId = undefined;
        socket.data.nickname = undefined;

        if (user) {
          io.emit("user:left", { userId: user.userId, nickname: user.nickname });
          const onlineUsers = await getOnlineUsers(redis);
          io.emit("users:list", onlineUsers);
        }
      } catch (err) {
        console.error("[Socket leave error]", err);
      }
    });

    // 9. Disconnect handling
    socket.on("disconnect", async () => {
      const userId = socket.data.userId;
      if (!userId) return;

      try {
        const { user } = await removeUser(redis, userId, socket.id);
        if (user) {
          io.emit("user:left", { userId: user.userId, nickname: user.nickname });
          const onlineUsers = await getOnlineUsers(redis);
          io.emit("users:list", onlineUsers);
        }
      } catch (err) {
        console.error("[Socket disconnect cleanup error]", err);
      }
    });
  });

  return io;
}
