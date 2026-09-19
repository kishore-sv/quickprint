import {
  afterAll,
  beforeAll,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { createServer, type Server } from "http";
import WebSocket from "ws";
import {
  generateDisplayToken,
  hashDisplayToken,
  verifyDisplayToken,
} from "../src/services/kiosk-display-auth.service";
import { createHmac } from "crypto";
import {
  buildDisplayStateFromJob,
  buildKioskDisplayEvent,
  isKioskDisplayActiveJob,
  mapJobToKioskDisplayState,
} from "../src/services/kiosk-display.service";
import {
  createDisplaySessionCookieValue,
  DISPLAY_SESSION_COOKIE,
  setDisplaySessionCookie,
  verifyDisplaySessionCookie,
} from "../src/services/kiosk-display-session.service";
import { parseDisplayAuthHeader } from "../src/ws/kiosk-display.protocol";
import { kioskDisplayEventSchema } from "../src/ws/kiosk-display.protocol";
import { buildKioskScanUrl } from "../src/utils/kiosk-scan-url";
import { buildKioskDisplayUrl } from "../src/utils/display-redirect-url";
import { env, KIOSK_DISPLAY_BOOTSTRAP_ORIGIN } from "../src/config/env";
import { createApp } from "../src/app";
import { attachWebSockets } from "../src/ws/attach-websockets";
import { DISPLAY_WS_PATH } from "../src/ws/kiosk-display.protocol";
import { WS_PATH as AGENT_WS_PATH } from "../src/ws/kiosk-agent.server";
import * as kioskDisplayAuth from "../src/services/kiosk-display-auth.service";
import * as kioskDisplayService from "../src/services/kiosk-display.service";

const mockKiosk = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  kioskCode: "KIOSK-001",
  publicToken: "pub-tok",
  name: "Development Kiosk",
  location: null,
  description: null,
  status: "ACTIVE" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSeenAt: null,
  agentTokenHash: "agent-hash",
  displayTokenHash: hashDisplayToken("valid-display-token"),
  agentHealth: null,
  agentVersion: null,
};

const expectedScanUrl = buildKioskScanUrl("pub-tok", env.FRONTEND_URL);

const idleDisplayState = {
  kioskCode: "KIOSK-001",
  kioskName: "Development Kiosk",
  scanUrl: expectedScanUrl,
  state: "IDLE" as const,
  jobId: null,
  updatedAt: new Date().toISOString(),
};

function job(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: "job-uuid",
    jobNumber: "QP-1",
    userId: "user-1",
    kioskId: "550e8400-e29b-41d4-a716-446655440000",
    savedFileId: null,
    status: "CLAIMED",
    paymentStatus: "PAID",
    originalFilename: "secret.pdf",
    storageKey: "key",
    fileSizeBytes: 100,
    fileHash: "hash",
    pageCount: 1,
    copies: 1,
    pageRange: "all",
    colorMode: "BW",
    paperSize: "A4",
    duplex: "SINGLE",
    pagesPerSheet: 1,
    order: "NORMAL",
    orientation: "PORTRAIT",
    fitToPage: false,
    physicalSheets: 1,
    amountPaise: 200,
    currency: "INR",
    pricingSnapshot: null,
    saveFile: false,
    fileRetentionUntil: null,
    createdAt: now,
    paidAt: now,
    claimedAt: now,
    printingStartedAt: null,
    completedAt: null,
    failedAt: null,
    dispatchedAt: now,
    printerJobId: null,
    failureReason: null,
    piPhase: "RECEIVED",
    userErrorCode: null,
    cleanupStatus: null,
    lastPiEventAt: now,
    ...overrides,
  };
}

mock.module("../src/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [mockKiosk],
        }),
      }),
    }),
  },
  pool: { end: async () => {} },
}));

describe("kiosk display auth", () => {
  test("display token hash is separate from agent hash", () => {
    const plain = "test-display-token";
    const displayHash = hashDisplayToken(plain);
    expect(displayHash).not.toBe(plain);
    expect(verifyDisplayToken(plain, displayHash)).toBe(true);
    expect(verifyDisplayToken("wrong", displayHash)).toBe(false);
  });

  test("generateDisplayToken returns url-safe string", () => {
    const token = generateDisplayToken();
    expect(token.length).toBeGreaterThan(20);
  });
});

describe("display session cookie", () => {
  test("round-trip sign and verify", () => {
    const value = createDisplaySessionCookieValue(mockKiosk);
    const session = verifyDisplaySessionCookie(value);
    expect(session?.kioskId).toBe(mockKiosk.id);
    expect(session?.kioskCode).toBe(mockKiosk.kioskCode);
  });

  test("rejects tampered cookie", () => {
    const value = createDisplaySessionCookieValue(mockKiosk);
    const tampered = value.slice(0, -4) + "xxxx";
    expect(verifyDisplaySessionCookie(tampered)).toBeNull();
  });

  test("rejects expired cookie", () => {
    const encoded = Buffer.from(
      JSON.stringify({
        kioskId: mockKiosk.id,
        kioskCode: mockKiosk.kioskCode,
        exp: Date.now() - 1000,
      })
    ).toString("base64url");
    const sig = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
      .update(`display-session:${encoded}`)
      .digest("base64url");
    expect(verifyDisplaySessionCookie(`${encoded}.${sig}`)).toBeNull();
  });

  test("setDisplaySessionCookie sets HttpOnly cookie", () => {
    const headers: Record<string, string | number | string[]> = {};
    const res = {
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
    };
    setDisplaySessionCookie(res as never, mockKiosk);
    const cookie = String(headers["set-cookie"]);
    expect(cookie).toContain(`${DISPLAY_SESSION_COOKIE}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("valid-display-token");
  });
});

describe("display auth header parsing", () => {
  test("parses Authorization header", () => {
    const parsed = parseDisplayAuthHeader("Bearer KIOSK-001:secret");
    expect(parsed).toEqual({ kioskCode: "KIOSK-001", secret: "secret" });
  });

  test("rejects malformed header", () => {
    expect(parseDisplayAuthHeader(undefined)).toBeNull();
    expect(parseDisplayAuthHeader("Bearer nocolon")).toBeNull();
  });
});

describe("kiosk display state mapping", () => {
  test("maps pi phases to display statuses", () => {
    expect(mapJobToKioskDisplayState(job({ piPhase: "RECEIVED" }))).toBe("RECEIVED");
    expect(mapJobToKioskDisplayState(job({ piPhase: "DOWNLOADING" }))).toBe("RECEIVED");
    expect(mapJobToKioskDisplayState(job({ piPhase: "READY" }))).toBe("PREPARED");
    expect(mapJobToKioskDisplayState(job({ piPhase: "SUBMITTED" }))).toBe("PREPARED");
    expect(mapJobToKioskDisplayState(job({ piPhase: "PRINTING", status: "PRINTING" }))).toBe(
      "PRINTING"
    );
    expect(
      mapJobToKioskDisplayState(
        job({ piPhase: "COMPLETED", status: "COMPLETED", completedAt: new Date() })
      )
    ).toBe("COMPLETED");
    expect(
      mapJobToKioskDisplayState(job({ piPhase: "FAILED", status: "FAILED", failedAt: new Date() }))
    ).toBe("FAILED");
  });

  test("failed status wins over stale printing phase", () => {
    expect(
      mapJobToKioskDisplayState(
        job({ piPhase: "PRINTING", status: "FAILED", failedAt: new Date() })
      )
    ).toBe("FAILED");
  });

  test("buildDisplayStateFromJob returns IDLE without job", () => {
    const state = buildDisplayStateFromJob(mockKiosk, null);
    expect(state.state).toBe("IDLE");
    expect(state.jobId).toBeNull();
    expect(state.scanUrl).toBe(expectedScanUrl);
  });

  test("stale completed returns IDLE", () => {
    const old = new Date(Date.now() - 10_000);
    const row = job({ status: "COMPLETED", piPhase: "COMPLETED", completedAt: old });
    const state = buildDisplayStateFromJob(mockKiosk, row);
    expect(state.state).toBe("IDLE");
  });

  test("recent completed stays COMPLETED", () => {
    const row = job({ status: "COMPLETED", piPhase: "COMPLETED", completedAt: new Date() });
    const state = buildDisplayStateFromJob(mockKiosk, row);
    expect(state.state).toBe("COMPLETED");
    expect(state.jobId).toBe("job-uuid");
  });

  test("stale failed returns IDLE", () => {
    const old = new Date(Date.now() - 10_000);
    const row = job({ status: "FAILED", piPhase: "FAILED", failedAt: old });
    expect(isKioskDisplayActiveJob(row)).toBe(false);
    expect(buildDisplayStateFromJob(mockKiosk, row).state).toBe("IDLE");
  });

  test("stale cancelled returns IDLE", () => {
    const old = new Date(Date.now() - 10_000);
    const row = job({ status: "CANCELLED", piPhase: "FAILED", failedAt: old });
    expect(isKioskDisplayActiveJob(row)).toBe(false);
    expect(buildDisplayStateFromJob(mockKiosk, row).state).toBe("IDLE");
  });

  test("stale CLAIMED+READY returns IDLE", () => {
    const old = new Date(Date.now() - 60 * 60 * 1000);
    const row = job({
      status: "CLAIMED",
      piPhase: "READY",
      lastPiEventAt: old,
      dispatchedAt: old,
      claimedAt: old,
    });
    expect(isKioskDisplayActiveJob(row)).toBe(false);
    expect(buildDisplayStateFromJob(mockKiosk, row).state).toBe("IDLE");
  });

  test("active RECEIVED job is displayable", () => {
    const row = job({ status: "CLAIMED", piPhase: "RECEIVED" });
    expect(isKioskDisplayActiveJob(row)).toBe(true);
    expect(buildDisplayStateFromJob(mockKiosk, row).state).toBe("RECEIVED");
  });

  test("active READY/SUBMITTED jobs show PREPARED", () => {
    const ready = job({ status: "DOWNLOADING", piPhase: "READY" });
    expect(buildDisplayStateFromJob(mockKiosk, ready).state).toBe("PREPARED");

    const submitted = job({ status: "PRINTING", piPhase: "SUBMITTED" });
    expect(buildDisplayStateFromJob(mockKiosk, submitted).state).toBe("PREPARED");
  });

  test("active PRINTING job is displayable", () => {
    const row = job({ status: "PRINTING", piPhase: "PRINTING" });
    expect(isKioskDisplayActiveJob(row)).toBe(true);
    expect(buildDisplayStateFromJob(mockKiosk, row).state).toBe("PRINTING");
  });

  test("completed past grace window returns IDLE on refresh", () => {
    const old = new Date(Date.now() - 10_000);
    const row = job({ status: "COMPLETED", piPhase: "COMPLETED", completedAt: old });
    expect(buildDisplayStateFromJob(mockKiosk, row, new Date()).state).toBe("IDLE");
  });
});

describe("kiosk display events", () => {
  test("sanitized event has no private fields", () => {
    const event = buildKioskDisplayEvent(mockKiosk, job());
    expect(event).toEqual({
      type: "kiosk.job.status",
      kioskCode: "KIOSK-001",
      jobId: "job-uuid",
      status: "RECEIVED",
      updatedAt: event.updatedAt,
    });
    expect(kioskDisplayEventSchema.safeParse(event).success).toBe(true);
    expect(event).not.toHaveProperty("originalFilename");
    expect(event).not.toHaveProperty("userId");
    expect(event).not.toHaveProperty("storageKey");
  });
});

describe("kiosk scan url", () => {
  test("buildKioskScanUrl uses canonical /scan/{token} path", () => {
    expect(buildKioskScanUrl("tok123", "https://quickprint.fun")).toBe(
      "https://quickprint.fun/scan/tok123"
    );
  });
});

describe("kiosk display session HTTP", () => {
  let server: Server;
  let port: number;
  let authSpy: ReturnType<typeof spyOn>;
  let stateSpy: ReturnType<typeof spyOn>;

  beforeAll(async () => {
    authSpy = spyOn(kioskDisplayAuth, "authenticateKioskDisplay");
    stateSpy = spyOn(kioskDisplayService, "getKioskDisplayState");

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
    authSpy.mockRestore();
    stateSpy.mockRestore();
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

  test("valid display token creates session", async () => {
    authSpy.mockImplementation(async (kioskCode, secret) => {
      if (kioskCode === "KIOSK-001" && secret === "valid-display-token") {
        return { ok: true, kiosk: mockKiosk };
      }
      return { ok: false, reason: "token_mismatch" };
    });

    const res = await fetch(`http://127.0.0.1:${port}/kiosks/KIOSK-001/display-session`, {
      method: "POST",
      headers: {
        Authorization: "Bearer KIOSK-001:valid-display-token",
        Origin: KIOSK_DISPLAY_BOOTSTRAP_ORIGIN,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ ok: true });
    expect(JSON.stringify(body)).not.toContain("valid-display-token");

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${DISPLAY_SESSION_COOKIE}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).not.toContain("valid-display-token");
  });

  test("invalid display token rejected", async () => {
    authSpy.mockResolvedValue({ ok: false, reason: "token_mismatch" });

    const res = await fetch(`http://127.0.0.1:${port}/kiosks/KIOSK-001/display-session`, {
      method: "POST",
      headers: { Authorization: "Bearer KIOSK-001:wrong" },
    });

    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  test("missing token rejected", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/kiosks/KIOSK-001/display-session`, {
      method: "POST",
    });

    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  test("form POST sets cookie and redirects to kiosk display URL", async () => {
    authSpy.mockImplementation(async (kioskCode, secret) => {
      if (kioskCode === "KIOSK-001" && secret === "valid-display-token") {
        return { ok: true, kiosk: mockKiosk };
      }
      return { ok: false, reason: "token_mismatch" };
    });

    const res = await fetch(`http://127.0.0.1:${port}/kiosks/KIOSK-001/display-session`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "display_token=valid-display-token",
      redirect: "manual",
    });

    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(location).toBe(buildKioskDisplayUrl("KIOSK-001"));
    expect(location).not.toContain("display_token");
    expect(location).not.toContain("displayToken");
    expect(location).not.toContain("DISPLAY_TOKEN");
    expect(location).not.toContain("AGENT_SECRET");
    expect(location).not.toMatch(/[?&]token=/);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${DISPLAY_SESSION_COOKIE}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).not.toContain("valid-display-token");
  });

  test("form POST with invalid token redirects to bootstrap error", async () => {
    authSpy.mockResolvedValue({ ok: false, reason: "token_mismatch" });

    const res = await fetch(`http://127.0.0.1:${port}/kiosks/KIOSK-001/display-session`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "display_token=wrong",
      redirect: "manual",
    });

    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(location).toBe(`${KIOSK_DISPLAY_BOOTSTRAP_ORIGIN}/error?code=pairing_failed`);
    expect(location).not.toContain(buildKioskDisplayUrl("KIOSK-001"));
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  test("valid session cookie authenticates REST", async () => {
    stateSpy.mockResolvedValue(idleDisplayState);
    const cookieValue = createDisplaySessionCookieValue(mockKiosk);

    const res = await fetch(`http://127.0.0.1:${port}/kiosks/KIOSK-001/display-state`, {
      headers: { Cookie: `${DISPLAY_SESSION_COOKIE}=${encodeURIComponent(cookieValue)}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.state).toBe("IDLE");
    expect(body.data).not.toHaveProperty("originalFilename");
    expect(body.data).not.toHaveProperty("userId");
  });

  test("invalid cookie rejected on REST", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/kiosks/KIOSK-001/display-state`, {
      headers: { Cookie: `${DISPLAY_SESSION_COOKIE}=invalid.value` },
    });

    expect(res.status).toBe(401);
  });

  test("bearer token no longer authenticates display-state", async () => {
    authSpy.mockImplementation(async (kioskCode, secret) => {
      if (kioskCode === "KIOSK-001" && secret === "valid-display-token") {
        return { ok: true, kiosk: mockKiosk };
      }
      return { ok: false, reason: "token_mismatch" };
    });

    const res = await fetch(`http://127.0.0.1:${port}/kiosks/KIOSK-001/display-state`, {
      headers: { Authorization: "Bearer KIOSK-001:valid-display-token" },
    });

    expect(res.status).toBe(401);
  });

  test("different kiosk cannot use another kiosk session", async () => {
    stateSpy.mockResolvedValue(idleDisplayState);
    const cookieValue = createDisplaySessionCookieValue(mockKiosk);

    const res = await fetch(`http://127.0.0.1:${port}/kiosks/KIOSK-002/display-state`, {
      headers: { Cookie: `${DISPLAY_SESSION_COOKIE}=${encodeURIComponent(cookieValue)}` },
    });

    expect(res.status).toBe(401);
  });

  test("CORS preflight from bootstrap origin", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/kiosks/KIOSK-001/display-session`, {
      method: "OPTIONS",
      headers: {
        Origin: KIOSK_DISPLAY_BOOTSTRAP_ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(KIOSK_DISPLAY_BOOTSTRAP_ORIGIN);
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  test("valid session cookie authenticates WebSocket", async () => {
    stateSpy.mockResolvedValue(idleDisplayState);
    const cookieValue = createDisplaySessionCookieValue(mockKiosk);

    const ws = new WebSocket(`ws://127.0.0.1:${port}${DISPLAY_WS_PATH}`, {
      headers: { Cookie: `${DISPLAY_SESSION_COOKIE}=${cookieValue}` },
    });

    const opened = await new Promise<boolean>((resolve) => {
      ws.on("open", () => resolve(true));
      ws.on("close", () => resolve(false));
      ws.on("error", () => resolve(false));
    });

    expect(opened).toBe(true);
    ws.close();
  });

  test("invalid cookie rejected on WebSocket", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}${DISPLAY_WS_PATH}`, {
      headers: { Cookie: `${DISPLAY_SESSION_COOKIE}=bad.value` },
    });

    const closed = await new Promise<number | undefined>((resolve) => {
      ws.on("close", (code) => resolve(code));
      ws.on("error", () => resolve(undefined));
    });

    expect(closed).toBe(4401);
  });

  test("display cookie cannot access agent WebSocket", async () => {
    const cookieValue = createDisplaySessionCookieValue(mockKiosk);

    const ws = new WebSocket(`ws://127.0.0.1:${port}${AGENT_WS_PATH}`, {
      headers: { Cookie: `${DISPLAY_SESSION_COOKIE}=${cookieValue}` },
    });

    const closed = await new Promise<number | undefined>((resolve) => {
      ws.on("close", (code) => resolve(code));
      ws.on("error", () => resolve(undefined));
    });

    expect(closed).toBe(4401);
  });
});
