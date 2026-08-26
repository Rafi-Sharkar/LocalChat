import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a deterministic conversation ID for two users.
 * Regardless of who starts the conversation, the ID is always identical.
 */
export function getConversationId(userIdA: string, userIdB: string): string {
  if (!userIdA || !userIdB) return "";
  return [userIdA, userIdB].sort().join(":");
}

/**
 * Normalizes nicknames for case-insensitive duplicate checking.
 */
export function normalizeNickname(nickname: string): string {
  return nickname.trim().toLowerCase();
}

/**
 * Formats timestamps for display in chat messages.
 */
export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatFullTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Generates a vibrant, consistent avatar gradient based on a nickname or ID
 */
export function getAvatarColor(identifier: string): string {
  const gradients = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-purple-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-red-600",
    "from-cyan-500 to-blue-600",
    "from-violet-500 to-purple-600",
    "from-fuchsia-500 to-pink-600",
  ];
  
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

/**
 * Returns initials from a nickname (up to 2 characters)
 */
export function getInitials(name: string): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (trimmed.length <= 2) return trimmed.toUpperCase();
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}
