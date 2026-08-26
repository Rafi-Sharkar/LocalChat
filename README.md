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

## 📱 How to Connect from LAN / Wi-Fi Devices

1. Ensure the host computer and mobile devices are connected to the **same Wi-Fi network**.
2. Find the host computer's LAN IPv4 address:
   - **Windows**: Run `ipconfig` in Command Prompt / PowerShell (Look for `IPv4 Address`, e.g. `192.168.1.100`).
   - **Linux**: Run `ip addr` or `hostname -I`.
   - **macOS**: Run `ifconfig` or check **System Settings > Wi-Fi > Details**.
3. Open the browser on your phone/tablet and navigate to:
   ```text
   http://192.168.1.100:3000
   ```
4. Or simply scan the **QR Code** generated directly on the web app's join screen or sidebar!

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
