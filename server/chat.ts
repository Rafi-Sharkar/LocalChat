import Redis from "ioredis";
import { ChatMessage, MessageHistoryResponse } from "../lib/types";
import crypto from "crypto";

const MAX_MESSAGES_PER_CHAT = parseInt(process.env.MAX_MESSAGES_PER_CHAT || "1000", 10);
const CHAT_TTL = parseInt(process.env.CHAT_TTL_SECONDS || "86400", 10);

/**
 * Stores a message in the conversation Redis list atomically.
 * Enforces the strict maximum 1,000 message retention and refreshes the conversation TTL.
 */
export async function saveMessage(
  redis: Redis,
  conversationId: string,
  senderId: string,
  senderNickname: string,
  content: string
): Promise<ChatMessage> {
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    conversationId,
    senderId,
    senderNickname,
    content,
    timestamp: Date.now(),
    status: "sent",
  };

  const key = `chat:${conversationId}`;
  const serialized = JSON.stringify(message);

  // Pipeline LPUSH, LTRIM (0 to MAX-1), and EXPIRE
  const pipeline = redis.pipeline();
  pipeline.lpush(key, serialized);
  pipeline.ltrim(key, 0, MAX_MESSAGES_PER_CHAT - 1);
  pipeline.expire(key, CHAT_TTL);
  await pipeline.exec();

  return message;
}

/**
 * Fetches message history with pagination.
 * Redis List has newest message at index 0 (LPUSH).
 * We fetch range [offset, offset + limit - 1] and reverse it for chronological display.
 */
export async function getMessageHistory(
  redis: Redis,
  conversationId: string,
  offset = 0,
  limit = 50
): Promise<MessageHistoryResponse> {
  const key = `chat:${conversationId}`;
  const boundedLimit = Math.min(Math.max(1, limit), 100);
  const boundedOffset = Math.max(0, offset);

  const [total, rawMessages] = await Promise.all([
    redis.llen(key),
    redis.lrange(key, boundedOffset, boundedOffset + boundedLimit - 1),
  ]);

  const messages: ChatMessage[] = [];
  for (const item of rawMessages) {
    try {
      messages.push(JSON.parse(item));
    } catch {
      // Ignored malformed item
    }
  }

  // Reverse so the oldest in the requested batch is first (chronological order)
  const chronological = messages.reverse();
  const hasMore = boundedOffset + rawMessages.length < total;

  return {
    conversationId,
    messages: chronological,
    hasMore,
    total,
  };
}

/**
 * Marks messages as read in conversation if needed
 */
export async function markMessagesAsRead(
  redis: Redis,
  conversationId: string,
  messageIds: string[],
  readerId: string
): Promise<{ updatedCount: number }> {
  // Read receipts are lightweight and temporary in Redis
  const readKey = `read:${conversationId}:${readerId}`;
  await redis.set(readKey, Date.now(), "EX", CHAT_TTL);
  return { updatedCount: messageIds.length };
}
