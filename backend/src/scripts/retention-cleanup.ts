import { cleanupExpiredFiles } from "../services/retention.service";
import { logger } from "../utils/logger";

async function main() {
  await cleanupExpiredFiles();
  logger.info("Retention cleanup finished");
}

main().catch((err) => {
  logger.error({ err }, "Retention cleanup failed");
  process.exit(1);
});
