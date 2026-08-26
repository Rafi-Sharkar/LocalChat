export interface User {
  userId: string;
  nickname: string;
  socketId: string;
  joinedAt: number;
  lastSeen: number;
}

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderNickname: string;
  content: string;
  timestamp: number;
  status?: MessageStatus;
}

export interface JoinPayload {
  nickname: string;
  existingUserId?: string; // Optional session recovery
}

export interface JoinResponse {
  user: User;
  onlineUsers: User[];
  lanIp?: string;
  port?: number;
}

export interface SendMessagePayload {
  recipientId: string;
  content: string;
  clientTempId?: string;
}

export interface MessageHistoryPayload {
  conversationId: string;
  beforeTimestamp?: number;
  offset?: number;
  limit?: number;
}

export interface MessageHistoryResponse {
  conversationId: string;
  messages: ChatMessage[];
  hasMore: boolean;
  total: number;
}

export interface TypingPayload {
  recipientId: string;
  conversationId: string;
}

export interface MessageReadPayload {
  conversationId: string;
  messageIds: string[];
  readerId: string;
}

export interface NicknameChangePayload {
  newNickname: string;
}

export interface NicknameChangeResponse {
  userId: string;
  oldNickname: string;
  newNickname: string;
}

export interface SocketErrorPayload {
  code: string;
  message: string;
  field?: string;
}

// Socket.IO Typed Events
export interface ServerToClientEvents {
  'user:joined': (user: User) => void;
  'user:left': (data: { userId: string; nickname: string }) => void;
  'users:list': (users: User[]) => void;
  'user:presence': (user: User) => void;
  'user:nickname_changed': (data: NicknameChangeResponse) => void;
  'chat:message': (message: ChatMessage) => void;
  'chat:history': (data: MessageHistoryResponse) => void;
  'chat:error': (error: SocketErrorPayload) => void;
  'typing:start': (data: { senderId: string; senderNickname: string; conversationId: string }) => void;
  'typing:stop': (data: { senderId: string; conversationId: string }) => void;
  'message:read': (data: { conversationId: string; messageIds: string[]; readerId: string }) => void;
  'session:restored': (data: { user: User; onlineUsers: User[] }) => void;
  'session:expired': (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'user:join': (payload: JoinPayload, callback?: (res: { success: boolean; data?: JoinResponse; error?: SocketErrorPayload }) => void) => void;
  'user:heartbeat': () => void;
  'user:leave': () => void;
  'user:change_nickname': (payload: NicknameChangePayload, callback?: (res: { success: boolean; data?: NicknameChangeResponse; error?: SocketErrorPayload }) => void) => void;
  'chat:send': (payload: SendMessagePayload, callback?: (res: { success: boolean; data?: ChatMessage; error?: SocketErrorPayload }) => void) => void;
  'chat:history': (payload: MessageHistoryPayload, callback?: (res: { success: boolean; data?: MessageHistoryResponse; error?: SocketErrorPayload }) => void) => void;
  'typing:start': (payload: TypingPayload) => void;
  'typing:stop': (payload: TypingPayload) => void;
  'message:read': (payload: MessageReadPayload) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId?: string;
  nickname?: string;
  joinedAt?: number;
}
