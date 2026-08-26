import { z } from "zod";

const MIN_NICKNAME_LENGTH = parseInt(process.env.MIN_NICKNAME_LENGTH || "2", 10);
const MAX_NICKNAME_LENGTH = parseInt(process.env.MAX_NICKNAME_LENGTH || "30", 10);
const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH || "2000", 10);

export const nicknameSchema = z
  .string()
  .trim()
  .min(MIN_NICKNAME_LENGTH, { message: `Nickname must be at least ${MIN_NICKNAME_LENGTH} characters long.` })
  .max(MAX_NICKNAME_LENGTH, { message: `Nickname cannot exceed ${MAX_NICKNAME_LENGTH} characters.` })
  .regex(/^[a-zA-Z0-9_\-\s.]+$/, {
    message: "Nickname can only contain letters, numbers, spaces, dots, dashes, and underscores.",
  });

export const messageSchema = z
  .string()
  .trim()
  .min(1, { message: "Message content cannot be empty." })
  .max(MAX_MESSAGE_LENGTH, { message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.` });

export function validateNickname(nickname: unknown): { success: true; data: string } | { success: false; error: string } {
  if (typeof nickname !== "string") {
    return { success: false, error: "Invalid nickname format." };
  }
  const result = nicknameSchema.safeParse(nickname);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }
  return { success: true, data: result.data };
}

export function validateMessageContent(content: unknown): { success: true; data: string } | { success: false; error: string } {
  if (typeof content !== "string") {
    return { success: false, error: "Invalid message format." };
  }
  const result = messageSchema.safeParse(content);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }
  return { success: true, data: result.data };
}

/**
 * Basic payload sanitization to prevent accidental control char injection
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}
