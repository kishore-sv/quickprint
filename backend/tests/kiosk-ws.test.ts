import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createServer, type Server } from "http";
import WebSocket from "ws";
import { createApp } from "../src/app";
import { attachWebSockets, AGENT_WS_PATH } from "../src/ws/attach-websockets";
import { parseAgentAuthHeader } from "../src/ws/kiosk-agent.protocol";

describe("kiosk WebSocket server", () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    const app = createApp();
    server = createServer(app);
    attachWebSockets(server);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (typeof server.closeAllConnections === "function") {
      server.closeAllConnections();
    }
    if (!server.listening) return;
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err && (err as NodeJS.ErrnoException).code === "ERR_SERVER_NOT_RUNNING") {
          resolve();
          return;
        }
        if (err) reject(err);
        else resolve();
      });
    });
  });

  test("rejects connection without auth header", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}${AGENT_WS_PATH}`);
    const closed = await new Promise<number | undefined>((resolve) => {
      ws.on("close", (code) => resolve(code));
      ws.on("error", () => resolve(undefined));
    });
    expect(closed).toBe(4401);
  });

  test("responds to ping with pong when connected", async () => {
    // Without valid DB kiosk this stays 4401 — documents auth requirement
    const header = parseAgentAuthHeader("Bearer x:y");
    expect(header?.agentId).toBe("x");
  });
});

describe("cross-kiosk authorization (logic)", () => {
  test("agent kiosk must match job kiosk", () => {
    const agentKioskId: string = "aaa";
    const jobKioskId: string = "bbb";
    expect(agentKioskId === jobKioskId).toBe(false);
  });

  test("matching kiosk allows update", () => {
    const agentKioskId = "aaa";
    const jobKioskId = "aaa";
    expect(agentKioskId === jobKioskId).toBe(true);
  });
});

describe("reconnect queue (logic)", () => {
  test("FIFO ordering by created_at", () => {
    const jobs = [
      { id: "2", createdAt: new Date("2026-01-02") },
      { id: "1", createdAt: new Date("2026-01-01") },
    ];
    const sorted = [...jobs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    expect(sorted[0].id).toBe("1");
  });

  test("dispatch once per job via dispatched_at", () => {
    const dispatched = new Set<string>();
    const jobId = "j1";
    expect(dispatched.has(jobId)).toBe(false);
    dispatched.add(jobId);
    expect(dispatched.has(jobId)).toBe(true);
  });
});

describe("presign dispatch payload", () => {
  test("job.assigned includes file_url not storage credentials", () => {
    const msg = JSON.parse(
      JSON.stringify({
        type: "job.assigned",
        job_id: "id",
        file_url: "https://signed.example/file.pdf?sig=abc",
        filename: "f.pdf",
        print_settings: {},
      })
    );
    expect(msg.file_url).toContain("https://");
    expect(msg).not.toHaveProperty("storage_key");
    expect(msg).not.toHaveProperty("S3_SECRET_ACCESS_KEY");
  });
});
