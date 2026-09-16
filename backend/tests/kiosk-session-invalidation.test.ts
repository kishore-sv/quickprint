import { afterAll, beforeAll, describe, expect, mock, spyOn, test } from "bun:test";
import { createServer, type Server } from "http";
import { hashDisplayToken } from "../src/services/kiosk-display-auth.service";

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

let studentAuthEnabled = true;
const sessionUpdates: unknown[] = [];
const sessionInserts: unknown[] = [];

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

mock.module("../src/services/kiosk-dispatch.service", () => ({
  enqueueDispatchForKiosk: async () => {},
  onAgentConnected: async () => {},
  requeueUnacknowledgedJobsForKiosk: async () => 0,
  clearInFlightKiosk: () => {},
  markJobDispatchComplete: async () => {},
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
    update: () => ({
      set: (values: unknown) => ({
        where: async () => {
          sessionUpdates.push(values);
        },
      }),
    }),
    insert: () => ({
      values: async (values: unknown) => {
        sessionInserts.push(values);
      },
    }),
  },
  pool: { end: async () => {} },
}));

import { createApp } from "../src/app";
import * as kioskDisplayService from "../src/services/kiosk-display.service";

describe("kiosk session invalidation", () => {
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

  test("POST /kiosks/:token/session expires prior sessions before creating a new one", async () => {
    sessionUpdates.length = 0;
    sessionInserts.length = 0;
    studentAuthEnabled = true;

    const updatesBefore = sessionUpdates.length;
    const insertsBefore = sessionInserts.length;

    const res = await fetch(`http://127.0.0.1:${port}/kiosks/pub-tok/session`, {
      method: "POST",
    });

    expect(res.status).toBe(200);
    const newUpdates = sessionUpdates.slice(updatesBefore);
    const expiredSessionUpdates = newUpdates.filter(
      (u) =>
        u &&
        typeof u === "object" &&
        "expiresAt" in u &&
        !("lastSeenAt" in u)
    );
    expect(expiredSessionUpdates.length).toBe(1);
    expect(expiredSessionUpdates[0]).toEqual(
      expect.objectContaining({ expiresAt: expect.any(Date) })
    );
    expect(sessionInserts.length - insertsBefore).toBe(1);
    expect(sessionInserts[0]).toEqual(
      expect.objectContaining({
        kioskId: mockKiosk.id,
        userId: "user-1",
      })
    );
  });
});
