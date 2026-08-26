import Redis from "ioredis";
import { User } from "../lib/types";
import { normalizeNickname } from "../lib/utils";
import crypto from "crypto";

const USER_SESSION_TTL = parseInt(process.env.USER_SESSION_TTL_SECONDS || "60", 10);

/**
 * Attempts to join a user.
 * Validates uniqueness of nickname in Redis and stores session data.
 */
export async function registerUser(
  redis: Redis,
  nickname: string,
  socketId: string,
  existingUserId?: string
): Promise<{ success: true; user: User } | { success: false; error: string }> {
  const normalized = normalizeNickname(nickname);
  const nicknameKey = `nickname:${normalized}`;

  // Check if nickname already exists
  const existingIdForNick = await redis.get(nicknameKey);
  
  // If the nickname is taken by a different user
  if (existingIdForNick && (!existingUserId || existingIdForNick !== existingUserId)) {
    // Check if that user is actually alive
    const activeUser = await redis.get(`user:${existingIdForNick}`);
    if (activeUser) {
      return { success: false, error: "This nickname is already in use by another online user." };
    } else {
      // Clean up orphaned nickname key
      await redis.del(nicknameKey);
    }
  }

  const userId = existingUserId || crypto.randomUUID();
  const userKey = `user:${userId}`;
  const socketKey = `socket_user:${socketId}`;
  const now = Date.now();

  const user: User = {
    userId,
    nickname: nickname.trim(),
    socketId,
    joinedAt: now,
    lastSeen: now,
  };

  const pipeline = redis.pipeline();
  pipeline.set(nicknameKey, userId, "EX", USER_SESSION_TTL);
  pipeline.set(userKey, JSON.stringify(user), "EX", USER_SESSION_TTL);
  pipeline.set(socketKey, userId, "EX", USER_SESSION_TTL);
  pipeline.sadd("online:users", userId);

  await pipeline.exec();

  return { success: true, user };
}

/**
 * Renews the TTL for the active user session and updates lastSeen.
 */
export async function refreshUserPresence(
  redis: Redis,
  userId: string,
  socketId: string
): Promise<User | null> {
  const userKey = `user:${userId}`;
  const rawUser = await redis.get(userKey);
  if (!rawUser) return null;

  try {
    const user: User = JSON.parse(rawUser);
    user.lastSeen = Date.now();
    user.socketId = socketId;

    const normalized = normalizeNickname(user.nickname);
    const nicknameKey = `nickname:${normalized}`;
    const socketKey = `socket_user:${socketId}`;

    const pipeline = redis.pipeline();
    pipeline.set(userKey, JSON.stringify(user), "EX", USER_SESSION_TTL);
    pipeline.set(nicknameKey, userId, "EX", USER_SESSION_TTL);
    pipeline.set(socketKey, userId, "EX", USER_SESSION_TTL);
    pipeline.sadd("online:users", userId);
    await pipeline.exec();

    return user;
  } catch (err) {
    console.error("[Refresh Presence Error]", err);
    return null;
  }
}

/**
 * Removes a user from the active online set and cleans up keys.
 */
export async function removeUser(
  redis: Redis,
  userId: string,
  socketId?: string
): Promise<{ removed: boolean; user?: User }> {
  const userKey = `user:${userId}`;
  const rawUser = await redis.get(userKey);
  let user: User | undefined;

  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch {
      // Ignored
    }
  }

  const pipeline = redis.pipeline();
  pipeline.srem("online:users", userId);
  pipeline.del(userKey);

  if (user?.nickname) {
    const nicknameKey = `nickname:${normalizeNickname(user.nickname)}`;
    pipeline.del(nicknameKey);
  }

  if (socketId) {
    pipeline.del(`socket_user:${socketId}`);
  }

  await pipeline.exec();
  return { removed: true, user };
}

/**
 * Gets a user by socketId
 */
export async function getUserBySocketId(
  redis: Redis,
  socketId: string
): Promise<User | null> {
  const userId = await redis.get(`socket_user:${socketId}`);
  if (!userId) return null;
  return getUserById(redis, userId);
}

/**
 * Gets a user by userId
 */
export async function getUserById(
  redis: Redis,
  userId: string
): Promise<User | null> {
  const raw = await redis.get(`user:${userId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/**
 * Changes a user's nickname, ensuring uniqueness and atomic key update.
 */
export async function changeUserNickname(
  redis: Redis,
  userId: string,
  newNickname: string
): Promise<{ success: true; user: User; oldNickname: string } | { success: false; error: string }> {
  const user = await getUserById(redis, userId);
  if (!user) {
    return { success: false, error: "User session not found or expired." };
  }

  const oldNickname = user.nickname;
  const newNormalized = normalizeNickname(newNickname);
  const oldNormalized = normalizeNickname(oldNickname);

  if (newNormalized === oldNormalized) {
    // Only casing changed, or same name
    user.nickname = newNickname.trim();
    await redis.set(`user:${userId}`, JSON.stringify(user), "EX", USER_SESSION_TTL);
    return { success: true, user, oldNickname };
  }

  const newNickKey = `nickname:${newNormalized}`;
  const existingId = await redis.get(newNickKey);
  if (existingId && existingId !== userId) {
    const active = await redis.get(`user:${existingId}`);
    if (active) {
      return { success: false, error: "This nickname is already taken by another user." };
    }
  }

  user.nickname = newNickname.trim();
  user.lastSeen = Date.now();

  const pipeline = redis.pipeline();
  pipeline.del(`nickname:${oldNormalized}`);
  pipeline.set(newNickKey, userId, "EX", USER_SESSION_TTL);
  pipeline.set(`user:${userId}`, JSON.stringify(user), "EX", USER_SESSION_TTL);
  await pipeline.exec();

  return { success: true, user, oldNickname };
}

/**
 * Fetches all currently active online users, cleaning up any expired ghost sessions.
 */
export async function getOnlineUsers(redis: Redis): Promise<User[]> {
  const userIds = await redis.smembers("online:users");
  if (!userIds.length) return [];

  const keys = userIds.map((id) => `user:${id}`);
  const results = await redis.mget(...keys);

  const activeUsers: User[] = [];
  const staleIds: string[] = [];

  results.forEach((data, index) => {
    if (data) {
      try {
        activeUsers.push(JSON.parse(data));
      } catch {
        staleIds.push(userIds[index]);
      }
    } else {
      staleIds.push(userIds[index]);
    }
  });

  // Clean up stale IDs from Set
  if (staleIds.length > 0) {
    await redis.srem("online:users", ...staleIds);
  }

  return activeUsers.sort((a, b) => a.nickname.localeCompare(b.nickname));
}
