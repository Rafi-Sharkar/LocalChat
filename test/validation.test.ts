import { describe, it, expect } from "vitest";
import { validateNickname, validateMessageContent } from "../server/validation";

describe("Nickname Validation", () => {
  it("should accept valid nicknames", () => {
    expect(validateNickname("Rafi").success).toBe(true);
    expect(validateNickname("John_Doe").success).toBe(true);
    expect(validateNickname("Alex 123").success).toBe(true);
    expect(validateNickname("AB").success).toBe(true);
  });

  it("should reject empty or whitespace-only nicknames", () => {
    expect(validateNickname("").success).toBe(false);
    expect(validateNickname("   ").success).toBe(false);
  });

  it("should reject nicknames shorter than 2 characters", () => {
    expect(validateNickname("A").success).toBe(false);
  });

  it("should reject nicknames longer than 30 characters", () => {
    const longNick = "A".repeat(31);
    expect(validateNickname(longNick).success).toBe(false);
  });

  it("should reject invalid special characters", () => {
    expect(validateNickname("Rafi<script>").success).toBe(false);
    expect(validateNickname("user@example").success).toBe(false);
  });
});

describe("Message Validation", () => {
  it("should accept valid message contents", () => {
    expect(validateMessageContent("Hello world!").success).toBe(true);
    expect(validateMessageContent("👋 Welcome to LAN chat").success).toBe(true);
  });

  it("should reject empty or whitespace messages", () => {
    expect(validateMessageContent("").success).toBe(false);
    expect(validateMessageContent("   \n  ").success).toBe(false);
  });

  it("should reject messages exceeding 2000 characters", () => {
    const longMsg = "x".repeat(2001);
    expect(validateMessageContent(longMsg).success).toBe(false);
  });
});
