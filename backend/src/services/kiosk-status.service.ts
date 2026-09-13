import type { InferSelectModel } from "drizzle-orm";
import type { kiosks } from "../db/schema";
import { env } from "../config/env";
import { getKioskAgentRegistry } from "../ws/kiosk-agent.registry";

export function isKioskServiceOnline(kiosk: Pick<InferSelectModel<typeof kiosks>, "id" | "lastSeenAt">): boolean {
  const registry = getKioskAgentRegistry();
  if (!registry.isOnline(kiosk.id)) {
    return false;
  }
  if (!kiosk.lastSeenAt) {
    return true;
  }
  const ageMs = Date.now() - kiosk.lastSeenAt.getTime();
  return ageMs <= env.KIOSK_HEARTBEAT_TIMEOUT_SECONDS * 1000;
}

export function serializeKioskServiceStatus(kiosk: InferSelectModel<typeof kiosks>) {
  return {
    kiosk: {
      id: kiosk.id,
      name: kiosk.name,
      kiosk_code: kiosk.kioskCode,
      location: kiosk.location,
    },
    service: {
      online: isKioskServiceOnline(kiosk),
      last_seen: kiosk.lastSeenAt ?? null,
    },
  };
}
