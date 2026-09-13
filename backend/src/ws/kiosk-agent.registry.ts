import type { WebSocket } from "ws";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { kiosks } from "../db/schema";
import { wsLogger } from "../utils/logger";

type RegisteredAgent = {
  kioskId: string;
  socket: WebSocket;
  connectedAt: Date;
};

class KioskAgentRegistry {
  private byKioskId = new Map<string, RegisteredAgent>();

  register(kioskId: string, socket: WebSocket) {
    const existing = this.byKioskId.get(kioskId);
    if (existing && existing.socket !== socket) {
      try {
        existing.socket.close(4000, "replaced");
      } catch {
        /* ignore */
      }
    }
    this.byKioskId.set(kioskId, { kioskId, socket, connectedAt: new Date() });
    wsLogger.info({ kioskId }, "ws agent online");
  }

  unregister(kioskId: string, socket: WebSocket) {
    const current = this.byKioskId.get(kioskId);
    if (current?.socket === socket) {
      this.byKioskId.delete(kioskId);
      wsLogger.info({ kioskId }, "ws agent offline");
    }
  }

  getConnection(kioskId: string): WebSocket | null {
    return this.byKioskId.get(kioskId)?.socket ?? null;
  }

  isOnline(kioskId: string): boolean {
    const s = this.getConnection(kioskId);
    return s != null && s.readyState === 1;
  }

  async touchKioskLastSeen(kioskId: string) {
    await db.update(kiosks).set({ lastSeenAt: new Date() }).where(eq(kiosks.id, kioskId));
  }
}

let registry: KioskAgentRegistry | null = null;

export function getKioskAgentRegistry(): KioskAgentRegistry {
  if (!registry) registry = new KioskAgentRegistry();
  return registry;
}

export function resetKioskAgentRegistry() {
  registry = new KioskAgentRegistry();
}
