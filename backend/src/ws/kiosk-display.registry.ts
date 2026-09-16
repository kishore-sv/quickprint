import type { WebSocket } from "ws";
import { wsLogger } from "../utils/logger";

type RegisteredDisplay = {
  kioskId: string;
  socket: WebSocket;
  connectedAt: Date;
};

class KioskDisplayRegistry {
  private byKioskId = new Map<string, Set<RegisteredDisplay>>();

  register(kioskId: string, socket: WebSocket) {
    const entry: RegisteredDisplay = { kioskId, socket, connectedAt: new Date() };
    let set = this.byKioskId.get(kioskId);
    if (!set) {
      set = new Set();
      this.byKioskId.set(kioskId, set);
    }
    set.add(entry);
    wsLogger.info({ kioskId }, "ws display online");

    socket.on("close", () => this.unregister(kioskId, socket));
    socket.on("error", () => this.unregister(kioskId, socket));
  }

  unregister(kioskId: string, socket: WebSocket) {
    const set = this.byKioskId.get(kioskId);
    if (!set) return;
    for (const entry of set) {
      if (entry.socket === socket) {
        set.delete(entry);
        break;
      }
    }
    if (set.size === 0) {
      this.byKioskId.delete(kioskId);
    }
    wsLogger.info({ kioskId }, "ws display offline");
  }

  broadcast(kioskId: string, payload: string) {
    const set = this.byKioskId.get(kioskId);
    if (!set) return;
    for (const { socket } of set) {
      if (socket.readyState === 1) {
        socket.send(payload);
      }
    }
  }
}

let registry: KioskDisplayRegistry | null = null;

export function getKioskDisplayRegistry(): KioskDisplayRegistry {
  if (!registry) registry = new KioskDisplayRegistry();
  return registry;
}

export function resetKioskDisplayRegistry() {
  registry = new KioskDisplayRegistry();
}
