import type { WebSocket } from "ws";
import { authenticateKioskAgent } from "../services/kiosk-agent-auth.service";
import {
  logAgentConnected,
  logAgentDisconnected,
  persistAgentHeartbeat,
} from "../services/kiosk-health.service";
import {
  onAgentConnected,
  requeueUnacknowledgedJobsForKiosk,
} from "../services/kiosk-dispatch.service";
import { applyPiOutboundMessage } from "../services/pi-status.service";
import { applyPrinterTelemetry } from "../services/printer-telemetry.service";
import { wsLogger } from "../utils/logger";
import {
  PiOutboundType,
  buildPongMessage,
  parseAgentAuthHeader,
  piOutboundMessageSchema,
  piPrinterTelemetrySchema,
} from "./kiosk-agent.protocol";
import { getKioskAgentRegistry } from "./kiosk-agent.registry";
import { clearInFlightKiosk } from "../services/kiosk-dispatch.service";

const WS_PATH = "/ws/kiosk";

export async function handleKioskAgentConnection(
  ws: WebSocket,
  req: { headers: Record<string, string | string[] | undefined> }
) {
  const authRaw = req.headers.authorization ?? req.headers.Authorization;
  const authHeader = Array.isArray(authRaw) ? authRaw[0] : authRaw;
  const parsed = parseAgentAuthHeader(authHeader);
  if (!parsed) {
    ws.close(4401, "unauthorized");
    return;
  }

  const auth = await authenticateKioskAgent(parsed.agentId, parsed.secret);
  if (!auth.ok) {
    wsLogger.warn(
      { agentId: parsed.agentId, reason: auth.reason },
      "ws auth failed"
    );
    ws.close(4401, "unauthorized");
    return;
  }
  const kiosk = auth.kiosk;

  const registry = getKioskAgentRegistry();
  registry.register(kiosk.id, ws);
  await registry.touchKioskLastSeen(kiosk.id);
  await onAgentConnected(kiosk.id);
  void logAgentConnected(kiosk.id);

  let messageChain: Promise<void> = Promise.resolve();
  ws.on("message", (data) => {
    messageChain = messageChain
      .then(() => handleMessage(kiosk.id, data.toString()))
      .catch((err) => {
        wsLogger.warn({ kioskId: kiosk.id, err }, "ws message handler error");
      });
  });

  ws.on("close", () => {
    registry.unregister(kiosk.id, ws);
    clearInFlightKiosk(kiosk.id);
    void requeueUnacknowledgedJobsForKiosk(kiosk.id);
    void logAgentDisconnected(kiosk.id);
  });

  ws.on("error", () => {
    registry.unregister(kiosk.id, ws);
    clearInFlightKiosk(kiosk.id);
    void requeueUnacknowledgedJobsForKiosk(kiosk.id);
    void logAgentDisconnected(kiosk.id);
  });
}

async function handleMessage(kioskId: string, raw: string) {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    wsLogger.warn({ kioskId }, "ws invalid json");
    return;
  }

  const parsed = piOutboundMessageSchema.safeParse(json);
  if (!parsed.success) {
    wsLogger.warn({ kioskId }, "ws invalid message shape");
    return;
  }

  const msg = parsed.data;
  if (msg.type === PiOutboundType.PONG) {
    return;
  }

  if (msg.type === PiOutboundType.PRINTER_TELEMETRY) {
    const telemetry = piPrinterTelemetrySchema.safeParse(json);
    if (!telemetry.success) {
      wsLogger.warn({ kioskId }, "ws invalid printer.telemetry");
      return;
    }
    await applyPrinterTelemetry(kioskId, telemetry.data);
    return;
  }

  if (msg.type === PiOutboundType.AGENT_HEARTBEAT) {
    const registry = getKioskAgentRegistry();
    await registry.touchKioskLastSeen(kioskId);
    const health =
      msg.health && typeof msg.health === "object"
        ? (msg.health as Record<string, unknown>)
        : null;
    await persistAgentHeartbeat(kioskId, health);
    return;
  }

  if (msg.type === "ping") {
    const registry = getKioskAgentRegistry();
    const socket = registry.getConnection(kioskId);
    socket?.send(buildPongMessage());
    return;
  }

  await applyPiOutboundMessage(kioskId, msg.type, msg.job_id, msg as Record<string, unknown>);
}

export { WS_PATH };
