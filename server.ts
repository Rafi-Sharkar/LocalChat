import http from "http";
import os from "os";
import next from "next";
import dotenv from "dotenv";
import { getRedisClient } from "./lib/redis";
import { initializeSocketServer } from "./server/socket";

// Load environment variables
dotenv.config();

const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";

/**
 * Automatically discovers the primary LAN IPv4 address
 */
export function getLocalIpAddress(): string {
  if (process.env.HOST_LAN_IP && process.env.HOST_LAN_IP !== "127.0.0.1") {
    return process.env.HOST_LAN_IP;
  }
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (!netList) continue;
    for (const net of netList) {
      // Skip internal (127.0.0.1), docker internal (172.17.. - 172.31..), and non-IPv4 addresses
      if (net.family === "IPv4" && !net.internal && !net.address.startsWith("172.")) {
        return net.address;
      }
    }
  }
  return process.env.HOST_LAN_IP || "10.10.24.90";
}

async function startServer() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  try {
    await app.prepare();

    const configuredLanIp = getLocalIpAddress();
    const redis = getRedisClient();

    // Verify Redis connection at startup
    try {
      await redis.ping();
      console.log("[\x1b[32mRedis\x1b[0m] Connected & Ready");
    } catch (err: any) {
      console.error("[\x1b[31mRedis Error\x1b[0m] Could not connect to Redis at startup:", err.message);
      console.warn("[\x1b[33mWarning\x1b[0m] Please ensure Redis is running via Docker or locally.");
    }

    const server = http.createServer((req, res) => {
      // Small helper endpoint to get server LAN info dynamically
      if (req.url === "/api/lan-info") {
        res.writeHead(200, { "Content-Type": "application/json" });
        const requestHost = req.headers.host;
        let resolvedHost = `http://${configuredLanIp}:${port}`;
        
        // If accessed from a real LAN IP (not localhost), use that
        if (requestHost && !requestHost.includes("localhost") && !requestHost.includes("127.0.0.1") && !requestHost.startsWith("172.")) {
          resolvedHost = `http://${requestHost}`;
        }
        
        res.end(JSON.stringify({ lanIp: configuredLanIp, port, fullUrl: resolvedHost }));
        return;
      }

      handle(req, res);
    });

    // Attach Socket.IO
    initializeSocketServer(server, redis, configuredLanIp, port);

    server.listen(port, hostname, () => {
      console.log(`
\x1b[36m===================================================================\x1b[0m
  🚀 \x1b[1m\x1b[32mTEMPORARY LAN REAL-TIME CHAT SERVER RUNNING\x1b[0m
\x1b[36m===================================================================\x1b[0m
  • \x1b[1mLocal URL:\x1b[0m        http://localhost:${port}
  • \x1b[1m\x1b[32mLAN Wi-Fi URL:\x1b[0m    \x1b[1m\x1b[33mhttp://${configuredLanIp}:${port}\x1b[0m
  • \x1b[1mBind Address:\x1b[0m     ${hostname}:${port}
  • \x1b[1mEnvironment:\x1b[0m      ${dev ? "development" : "production"}
  • \x1b[1mRedis Data:\x1b[0m       100% Temporary with TTL (Zero permanent DB)
\x1b[36m===================================================================\x1b[0m
  📱 Scan QR code or visit \x1b[33mhttp://${configuredLanIp}:${port}\x1b[0m from any device on this Wi-Fi!
\x1b[36m===================================================================\x1b[0m
`);
    });

    const gracefulShutdown = () => {
      console.log("\n[Server] Shutting down gracefully...");
      server.close(() => {
        redis.disconnect();
        process.exit(0);
      });
    };

    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
  } catch (err) {
    console.error("[Server Crash]", err);
    process.exit(1);
  }
}

startServer();
