import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { attachWebSockets, AGENT_WS_PATH, DISPLAY_WS_PATH } from "./ws/attach-websockets";
import { startPrinterTelemetryStaleMonitor } from "./services/printer-telemetry-stale.monitor";

const app = createApp();
const server = createServer(app);

attachWebSockets(server);
startPrinterTelemetryStaleMonitor();

server.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, agentWsPath: AGENT_WS_PATH, displayWsPath: DISPLAY_WS_PATH },
    "QuickPrint API listening"
  );
});
