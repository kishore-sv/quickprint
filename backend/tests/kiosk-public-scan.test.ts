import { afterAll, beforeAll, describe, expect, mock, spyOn, test } from "bun:test";
import { createServer, type Server } from "http";
import { hashDisplayToken } from "../src/services/kiosk-display-auth.service";
import {
  createDisplaySessionCookieValue,
  DISPLAY_SESSION_COOKIE,
} from "../src/services/kiosk-display-session.service";
const mockKiosk = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  kioskCode: "KIOSK-001",
  publicToken: "pub-tok",
  name: "Development Kiosk",
  location: null,
  status: "ACTIVE" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSeenAt: null,
  agentTokenHash: "agent-hash",
  displayTokenHash: hashDisplayToken("valid-display-token"),
};

let studentAuthEnabled = false;

mock.module("../src/auth", () => ({
  auth: {
    api: {
      getSession: async () => {
        if (!studentAuthEnabled) return null;
        return {
          user: { id: "user-1", isAnonymous: true, name: null, email: null },
          session: { id: "sess-1" },
        };
      },
    },
  },
}));

const enqueueDispatchForKiosk = mock(() => Promise.resolve(0));

mock.module("../src/services/kiosk-dispatch.service", () => ({
  enqueueDispatchForKiosk,
  onAgentConnected: async () => {},
  requeueUnacknowledgedJobsForKiosk: async () => {},
  clearInFlightKiosk: () => {},
  markJobDispatchComplete: async () => {},
}));

mock.module("../src/services/kiosk-bind.service", () => ({
  bindJobToUserKiosk: async () => ({}),
  getActiveKioskSessionForUser: async () => null,
  assertKioskSessionForUser: async () => {
    throw new Error("no session");
  },
}));

mock.module("../src/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [mockKiosk],
        }),
      }),
    }),
    insert: () => ({
      values: async () => {},
    }),
    update: () => ({
      set: () => ({
        where: async () => {},
      }),
    }),
  },
  pool: { end: async () => {} },
}));

import { createApp } from "../src/app";
import * as kioskDisplayService from "../src/services/kiosk-display.service";

describe("public kiosk scan auth boundaries", () => {
  let server: Server;
  let port: number;
  let stateSpy: ReturnType<typeof spyOn>;

  beforeAll(async () => {
    stateSpy = spyOn(kioskDisplayService, "getKioskDisplayState");
    stateSpy.mockResolvedValue({
      kioskCode: "KIOSK-001",
      kioskName: "Development Kiosk",
      scanUrl: "http://localhost:3000/scan/pub-tok",
      state: "IDLE",
      jobId: null,
      updatedAt: new Date().toISOString(),
    });

    const app = createApp();
    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterAll(async () => {
    stateSpy.mockRestore();
    studentAuthEnabled = false;
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

  test("GET /kiosks/:publicToken works without display cookie", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/kiosks/pub-tok`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.kiosk_code).toBe("KIOSK-001");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  test("GET /kiosks/:publicToken/status works without display cookie", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/kiosks/pub-tok/status`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.kiosk.kiosk_code).toBe("KIOSK-001");
  });

  test("POST /kiosks/:publicToken/session rejects unauthenticated requests", async () => {
    studentAuthEnabled = false;
    const res = await fetch(`http://127.0.0.1:${port}/kiosks/pub-tok/session`, {
      method: "POST",
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.detail).toBe("Missing or invalid authorization");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  test("POST /kiosks/:publicToken/session accepts student auth without dispatching jobs", async () => {
    studentAuthEnabled = true;
    enqueueDispatchForKiosk.mockClear();
    const res = await fetch(`http://127.0.0.1:${port}/kiosks/pub-tok/session`, {
      method: "POST",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.kiosk_code).toBe("KIOSK-001");
    expect(body.data.expires_at).toBeDefined();
    expect(body.data.released_job_ids).toBeUndefined();
    expect(enqueueDispatchForKiosk).not.toHaveBeenCalled();
    studentAuthEnabled = false;
  });

  test("GET /kiosks/:code/display-state rejects without qp_kiosk_display", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/kiosks/KIOSK-001/display-state`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.detail).toBe("Missing or invalid authorization");
  });

  test("GET /kiosks/:code/display-state accepts display session cookie", async () => {
    const cookieValue = createDisplaySessionCookieValue(mockKiosk);
    const res = await fetch(`http://127.0.0.1:${port}/kiosks/KIOSK-001/display-state`, {
      headers: { Cookie: `${DISPLAY_SESSION_COOKIE}=${encodeURIComponent(cookieValue)}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.state).toBe("IDLE");
  });

  test("public kiosk GET does not require DISPLAY_TOKEN", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/kiosks/pub-tok`, {
      headers: { Authorization: "Bearer KIOSK-001:valid-display-token" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  test("POST display-session does not create student kiosk session", async () => {
    studentAuthEnabled = false;
    const res = await fetch(`http://127.0.0.1:${port}/kiosks/KIOSK-001/display-session`, {
      method: "POST",
      headers: { Authorization: "Bearer KIOSK-001:wrong-display-token" },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.detail).toBe("Missing or invalid authorization");
  });
});
