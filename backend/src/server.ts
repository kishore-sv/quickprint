import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { attachKioskAgentWebSocket, WS_PATH } from "./ws/kiosk-agent.server";

const app = createApp();
const server = createServer(app);

attachKioskAgentWebSocket(server);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, wsPath: WS_PATH }, "QuickPrint API listening");
});
