import type { Server } from "http";
import { WebSocketServer } from "ws";
import { handleKioskAgentConnection } from "./kiosk-agent.server";
import { WS_PATH as AGENT_WS_PATH } from "./kiosk-agent.server";
import { handleKioskDisplayConnection } from "./kiosk-display.server";
import { DISPLAY_WS_PATH } from "./kiosk-display.protocol";

export function attachWebSockets(server: Server) {
  const agentWss = new WebSocketServer({ noServer: true });
  const displayWss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (url.pathname === AGENT_WS_PATH) {
      agentWss.handleUpgrade(req, socket, head, (ws) => {
        void handleKioskAgentConnection(ws, req);
      });
      return;
    }
    if (url.pathname === DISPLAY_WS_PATH) {
      displayWss.handleUpgrade(req, socket, head, (ws) => {
        void handleKioskDisplayConnection(ws, { ...req, url: req.url });
      });
      return;
    }
    socket.destroy();
  });

  return { agentWss, displayWss };
}

export { AGENT_WS_PATH, DISPLAY_WS_PATH };
