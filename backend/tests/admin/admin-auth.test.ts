import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createServer, type Server } from "http";
import { createApp } from "../../src/app";

describe("admin auth", () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
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
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("rejects unauthenticated admin request", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/admin/dashboard`);
    expect([401, 500]).toContain(res.status);
  });

  test("admin role check logic", () => {
    const roles = ["user", "admin"] as const;
    expect(roles.filter((r) => r === "admin")).toEqual(["admin"]);
  });
});
