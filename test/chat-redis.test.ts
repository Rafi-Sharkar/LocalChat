import { describe, it, expect, beforeEach } from "vitest";
import RedisMock from "ioredis-mock";
import { registerUser, removeUser, getOnlineUsers } from "../server/presence";
import { saveMessage, getMessageHistory } from "../server/chat";
import { checkRateLimit } from "../server/rateLimit";
import { getConversationId } from "../lib/utils";

describe("Redis Presence & Nickname Logic", () => {
  let redis: any;

  beforeEach(async () => {
    redis = new RedisMock();
    await redis.flushall();
  });

  it("should register a temporary user and add to online list", async () => {
    const res = await registerUser(redis, "Rafi", "socket-1");
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.user.nickname).toBe("Rafi");
    expect(res.user.userId).toBeDefined();

    const online = await getOnlineUsers(redis);
    expect(online.length).toBe(1);
    expect(online[0].nickname).toBe("Rafi");
  });

  it("should prevent case-insensitive duplicate nicknames", async () => {
    const res1 = await registerUser(redis, "Rafi", "socket-1");
    expect(res1.success).toBe(true);

    // Attempt to join as 'rafi' (lowercase)
    const res2 = await registerUser(redis, "rafi", "socket-2");
    expect(res2.success).toBe(false);
    if (!res2.success) {
      expect(res2.error).toContain("already in use");
    }

    // Attempt to join as 'RAFI' (uppercase)
    const res3 = await registerUser(redis, "RAFI", "socket-3");
    expect(res3.success).toBe(false);
  });

  it("should clean up user on removal / disconnect", async () => {
    const res = await registerUser(redis, "John", "socket-john");
    expect(res.success).toBe(true);
    if (!res.success) return;

    let online = await getOnlineUsers(redis);
    expect(online.length).toBe(1);

    await removeUser(redis, res.user.userId, "socket-john");
    online = await getOnlineUsers(redis);
    expect(online.length).toBe(0);

    // After removal, nickname should be free to take again
    const reJoin = await registerUser(redis, "john", "socket-new");
    expect(reJoin.success).toBe(true);
  });
});

describe("Deterministic Conversation IDs", () => {
  it("should generate identical conversationId regardless of user order", () => {
    const userA = "1111-aaaa";
    const userB = "2222-bbbb";

    const conv1 = getConversationId(userA, userB);
    const conv2 = getConversationId(userB, userA);

    expect(conv1).toBe(conv2);
    expect(conv1).toBe("1111-aaaa:2222-bbbb");
  });
});

describe("Strict 1,000 Message History Limit & Trimming", () => {
  let redis: any;

  beforeEach(async () => {
    redis = new RedisMock();
    await redis.flushall();
  });

  it("retains all messages when count <= 1000", async () => {
    const convId = "userA:userB";

    for (let i = 1; i <= 50; i++) {
      await saveMessage(redis, convId, "userA", "Rafi", `Message ${i}`);
    }

    const history = await getMessageHistory(redis, convId, 0, 100);
    expect(history.total).toBe(50);
    expect(history.messages.length).toBe(50);
    expect(history.messages[0].content).toBe("Message 1");
    expect(history.messages[49].content).toBe("Message 50");
  });

  it("enforces strict maximum 1,000 messages (deletes oldest when 1001st arrives)", async () => {
    const convId = "userA:userB";

    // Insert 1005 messages
    for (let i = 1; i <= 1005; i++) {
      await saveMessage(redis, convId, "userA", "Rafi", `Message ${i}`);
    }

    const total = await redis.llen(`chat:${convId}`);
    expect(total).toBe(1000); // Capped at exactly 1000

    // Fetch oldest messages in history (offset 950 to 1000)
    const oldestBatch = await getMessageHistory(redis, convId, 950, 50);
    // Oldest surviving message should be Message 6 (1 to 5 were dropped)
    expect(oldestBatch.messages[0].content).toBe("Message 6");

    // Fetch latest messages (offset 0)
    const latestBatch = await getMessageHistory(redis, convId, 0, 10);
    expect(latestBatch.messages[latestBatch.messages.length - 1].content).toBe("Message 1005");
  });
});

describe("Rate Limiting", () => {
  let redis: any;

  beforeEach(async () => {
    redis = new RedisMock();
    await redis.flushall();
  });

  it("should allow messages within limit and block when exceeded", async () => {
    const key = "test_user_limit";
    const limit = 5;
    const windowSeconds = 10;

    for (let i = 1; i <= limit; i++) {
      const res = await checkRateLimit(redis, { key, limit, windowSeconds });
      expect(res.allowed).toBe(true);
    }

    // 6th message should be blocked
    const blocked = await checkRateLimit(redis, { key, limit, windowSeconds });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
