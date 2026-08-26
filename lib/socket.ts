import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "./types";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getClientSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    // In browser, connect to the current origin (which works identically on localhost and LAN IP)
    socket = io({
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectClientSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
