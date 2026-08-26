# 🚀 Temporary LAN Real-Time Chat

A modern, fast, temporary real-time private chat application designed specifically for devices connected to the **same Wi-Fi / Local Area Network (LAN)**.

Built as a **single unified Next.js + Socket.IO project** powered by **temporary Redis storage**, with zero permanent databases and zero user accounts.

```
                    Same Wi-Fi Network
                            |
        +-------------------+-------------------+
        |                   |                   |
   📱 Phone (Rafi)     💻 Laptop (John)    📟 Tablet (Alex)
        |                   |                   |
        +-------------------+-------------------+
                            |
                     Host LAN IP Address
                   (e.g. 192.168.1.100:3000)
                            |
                   Next.js + Socket.IO
                            |
                  Redis (Pure In-Memory)
```

---

## ✨ Features

- **No Accounts / Zero Registration**: Pick a temporary nickname and start chatting immediately.
- **1-to-1 Private Chat**: Deterministic, stable conversation channels between any two online peers.
- **Dynamic LAN QR Code**: Instantly share the connection link to phones and tablets on the local network.
- **Strict 1,000 Message History**: Maximum 1,000 messages per conversation (`LPUSH` + `LTRIM 0 999`), oldest message automatically removed on the 1001st.
- **Automatic TTL & Self-Destruction**: 
  - Chats auto-expire after 24 hours of inactivity (`CHAT_TTL_SECONDS=86400`).
  - User presence auto-expires after 60 seconds of inactivity (`USER_SESSION_TTL_SECONDS=60`) with 20s heartbeats.
- **Duplicate Nickname Prevention**: Case-insensitive duplicate prevention (e.g. `Rafi` vs `rafi`).
- **Live Typing Indicators & Read Status**: Debounced typing indicators and `✓` / `✓✓` read receipts.
- **Infinite Scroll Pagination**: Loads latest 50 messages on open, smooth load-earlier pagination up to the 1,000-message limit.
- **Rate Limiting & XSS Protection**: Redis-backed sliding window rate limiters for messaging, nickname changes, and joins.
- **100% Containerized with Docker**: Run the entire stack (App + Redis) with a single Docker Compose command.

---

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router) + React 18
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS + Lucide Icons + Glassmorphism Theme
- **Real-Time**: Socket.IO with WebSocket transport
- **Temporary Storage**: Redis (In-memory only, no disk snapshots / AOF disabled)
- **Validation**: Zod schema validation
- **Testing**: Vitest + `ioredis-mock`
- **Deployment**: Docker & Docker Compose

---

## 🐳 Quickstart with Docker (Recommended)

Run the entire application and Redis temporary store inside Docker:

```bash
# Clone or navigate to the project directory
cd LocalChat

# Start both Next.js App and Redis
docker compose up --build -d
```

Once running:
- Access locally: `http://localhost:3000`
- Access on LAN: `http://<YOUR-LAN-IP>:3000` (e.g., `http://192.168.1.100:3000`)

To stop the containers:
```bash
docker compose down
```

---

## 💻 Local Development Setup (Node.js)

### Prerequisites
- Node.js 18+ or 20+
- Redis (running locally on port 6379 or via Docker)

### 1. Start Redis
Optionally start only the Redis container:
```bash
docker run -d --name lan-redis -p 6379:6379 redis:7-alpine redis-server --save "" --appendonly no
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Start Development Server
```bash
npm run dev
# or
pnpm dev
```

The server binds to `0.0.0.0:3000` and prints the active LAN IP in the console banner.

---

## 💬 How to Connect & Chat (User Guide)

Follow these simple steps to start chatting privately across your local network:

```
[ Step 1: Wi-Fi ]       [ Step 2: Open URL ]       [ Step 3: Pick Name ]       [ Step 4: Chat ]
Connect all devices  ->  Scan QR or visit       ->  Enter temporary      ->  Select online peer
to the same router       http://<HOST-IP>:3000      nickname (e.g. Rafi)     & start messaging!
```

### Step 1: Connect to the Same Wi-Fi / Local Network
Make sure the host machine running the server and any client devices (smartphones, tablets, other laptops) are connected to the **same Wi-Fi router or mobile hotspot**.

### Step 2: Open the Chat Web App
- **From Host PC**: Open `http://localhost:3000` in your browser.
- **From Other Devices (Phone/Tablet/Laptop)**:
  - Open `http://<HOST-LAN-IP>:3000` (e.g. `http://192.168.1.100:3000`).
  - **Or simply scan the QR code**: Click the **LAN QR Code** icon on the top right of the screen or sidebar to scan with your phone camera.

### Step 3: Choose a Temporary Nickname
- Type a nickname (2–30 characters, letters, numbers, spaces, or hyphens).
- Click **Join Chat**.
- If someone else is already using that nickname on the local network, you will be prompted to pick a different one.

### Step 4: Select an Online Peer
- Once inside, the left sidebar automatically lists all **Online Users** currently on your local network with green presence dots.
- Tap or click on any peer's name to open a private 1-to-1 conversation window.

### Step 5: Start Real-Time Messaging
- Type your message in the input box at the bottom and hit **Enter** or tap **Send**.
- **Real-Time Typing**: As you type, the other user sees an animated typing indicator.
- **Read Receipts**: 
  - `✓` (Single tick): Message delivered to the server and recipient.
  - `✓✓` (Double tick): Message viewed by the recipient.
- **Message History**: The last 50 messages load instantly. Scroll up to smoothly paginate through up to the last 1,000 messages.
- **Switch Conversations**: Click any other peer in the sidebar anytime to switch chats.

---

## 🧠 System Behavior & Lifecycle (Before, During & After)

Here is a breakdown of how the application behaves behind the scenes across the full communication lifecycle:

```
+-----------------------------------------------------------------------------------+
| 1. BEFORE JOINING (Pre-Chat)                                                      |
|   • Zero database records, zero signup/passwords, zero email verification.        |
|   • Client requests nickname -> Redis validates case-insensitive uniqueness.      |
|   • Session key registered in Redis: `user:{nickname}` with 60s TTL.             |
+-----------------------------------------------------------------------------------+
                                      │
                                      ▼
+-----------------------------------------------------------------------------------+
| 2. DURING CHAT (Active Real-Time State)                                           |
|   • WebSocket Transport: Socket.IO maintains low-latency bi-directional stream.   |
|   • Heartbeat Loop: Client sends heartbeat ping every 20s; resets 60s TTL.        |
|   • Deterministic Channels: Key format `chat:{min_user}:{max_user}` for 1-to-1.  |
|   • Strict Capped Buffer: Redis `LPUSH` + `LTRIM 0 999` limits max 1,000 msgs.   |
|   • Inactivity Expiration: Thread TTL resets to 24 hours on every message sent.  |
|   • Rate Limiting: Sliding window rate limits rapid message flooding or spam.    |
|   • Typing & Read Status: Ephemeral socket events sync typing status & read ticks.|
+-----------------------------------------------------------------------------------+
                                      │
                                      ▼
+-----------------------------------------------------------------------------------+
| 3. AFTER CHAT / DISCONNECTION (Self-Destruction & Zero Persistence)               |
|   • Immediate Close: Disconnect event removes user socket mapping & updates peers.|
|   • Abrupt Drop / Power Loss: Inactivity TTL auto-expires user key within 60s.    |
|   • Thread Expiry: Inactive conversations auto-delete from Redis after 24 hours.  |
|   • Server Shutdown / Restart: All data purged immediately (Redis in-memory only).|
+-----------------------------------------------------------------------------------+
```

### Detailed Behavior Summary:

1. **Before Joining (Handshake & Uniqueness)**:
   - No permanent accounts, passwords, or cookies are stored.
   - When a user joins, the backend checks Redis to ensure no case-insensitive collision exists (e.g. `Alex` blocks `alex`).
   - The user presence is registered in Redis with an initial 60-second time-to-live (TTL).

2. **During the Active Session (Real-Time Communication)**:
   - **Heartbeat Keep-Alive**: The browser client automatically emits a heartbeat every 20 seconds. The server refreshes the 60-second presence key in Redis, maintaining the user in the "Online Users" list.
   - **Deterministic 1-to-1 Chat Routing**: When Rafi talks to John, the room name is deterministically computed (`chat:John:Rafi` sorted alphabetically). Both users receive messages instantly without broadcasting to unrelated clients.
   - **1,000 Message FIFO Ring Buffer**: Messages are pushed to Redis lists using `LPUSH` followed immediately by `LTRIM 0 999`. The 1,001st message permanently drops the oldest message.
   - **Typing & Read Receipt Synchronization**: Debounced socket events inform peers when the other party is typing or actively viewing the message window.
   - **Spam & Flooding Protection**: Redis sliding window algorithms prevent message spam (max 20 messages per 10s) and rapid nickname churn.

3. **After Leaving / Disconnection (Clean Ephemeral Teardown)**:
   - **Graceful Tab Close**: The server catches the WebSocket disconnect, deletes the active socket mapping, and broadcasts the updated online user roster to all peers in real-time.
   - **Network Loss / Crash Recovery**: If a mobile device goes out of Wi-Fi range or loses battery, Redis automatically purges the user's presence record as soon as the 60-second TTL expires.
   - **24-Hour Conversation Expiration**: If neither participant sends a message in a conversation for 24 hours (`CHAT_TTL_SECONDS=86400`), Redis automatically evicts the entire message list.
   - **Server Restart / Zero Disk Traces**: Because Redis is configured with `--save ""` and `--appendonly no`, shutting down or restarting the container completely clears all memory, leaving zero residual files on disk.

---

## 🛡️ Firewall & Network Troubleshooting

### 1. Windows Firewall
If other devices cannot load the page:
1. Open **Windows Defender Firewall with Advanced Security**.
2. Click **Inbound Rules** > **New Rule**.
3. Select **Port** > **TCP** > Specific local ports: `3000`.
4. Allow the connection on Private networks.

Alternatively, via PowerShell (Administrator):
```powershell
New-NetFirewallRule -DisplayName "LAN Chat Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 2. Linux (UFW)
```bash
sudo ufw allow 3000/tcp
```

### 3. Wi-Fi AP / Client Isolation (Important Notice)
Some public, office, or guest Wi-Fi routers enable **AP Isolation / Client Isolation / Guest Network Isolation**. When enabled, the router prevents connected Wi-Fi devices from communicating with one another.
- **Solution**: Use a standard private home Wi-Fi network, router where client isolation is disabled, or create a mobile Wi-Fi hotspot from your phone/laptop.

---

## ⚙️ Environment Variables Reference

Create a `.env` file (copied from `.env.example`):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection URL |
| `PORT` | `3000` | Port to bind server |
| `HOSTNAME` | `0.0.0.0` | Hostname (`0.0.0.0` binds to all LAN interfaces) |
| `MAX_MESSAGES_PER_CHAT` | `1000` | Maximum messages preserved per 1-to-1 conversation |
| `CHAT_TTL_SECONDS` | `86400` | Conversation auto-expiration time (24 hours) |
| `USER_SESSION_TTL_SECONDS` | `60` | User presence TTL (renewed by 20s heartbeats) |
| `HEARTBEAT_INTERVAL_SECONDS` | `20` | Client heartbeat interval |
| `MAX_MESSAGE_LENGTH` | `2000` | Character limit per chat message |
| `MAX_NICKNAME_LENGTH` | `30` | Maximum nickname length |
| `MIN_NICKNAME_LENGTH` | `2` | Minimum nickname length |
| `MESSAGE_RATE_LIMIT` | `20` | Messages allowed per rate limit window |
| `MESSAGE_RATE_WINDOW_SECONDS` | `10` | Message rate limit window duration |

---

## 🧪 Running Automated Tests

Run the full Vitest suite covering nickname uniqueness, presence lifecycle, message validation, strict 1000-message limits, and Redis atomic operations:

```bash
npm test
# or
pnpm test
```

To run Next.js linter and build checks:
```bash
npm run lint
npm run build
```

---

## 🔒 100% Temporary Storage Guarantee

This application does **not** use PostgreSQL, MySQL, MongoDB, SQLite, or any persistent database. 
- All data resides exclusively in Redis with active TTLs.
- Docker Redis is configured with `--save "" --appendonly no` to ensure zero disk persistence.
- When Redis restarts or keys expire, all history is permanently deleted.

---

## 📄 License
MIT License. Free for personal and local network real-time communication.
