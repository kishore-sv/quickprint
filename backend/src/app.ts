import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { auth } from "./auth";
import { isAllowedCorsOrigin } from "./config/env";
import { errorMiddleware } from "./middleware/error.middleware";
import { configRoutes } from "./routes/config.routes";
import { filesRoutes } from "./routes/files.routes";
import { healthRoutes } from "./routes/health.routes";
import { kiosksRoutes } from "./routes/kiosks.routes";
import { meRoutes } from "./routes/me.routes";
import { paymentsRoutes } from "./routes/payments.routes";
import { printJobsRoutes } from "./routes/print-jobs.routes";
import { adminRoutes } from "./routes/admin.routes";
import { logger } from "./utils/logger";

export function createApp() {
  const app = express();

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === "/health" },
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedCorsOrigin(origin)) {
          callback(null, origin ?? true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["set-auth-token"],
    })
  );

  app.all("/api/auth/*", toNodeHandler(auth));

  const jsonParser = express.json();
  app.use((req, res, next) => {
    if (req.path === "/payments/webhook") return next();
    return jsonParser(req, res, next);
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/auth", authLimiter);

  const paymentLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
  });
  app.use("/payments", paymentLimiter);

  app.use(healthRoutes);
  app.use(configRoutes);
  app.use(meRoutes);
  app.use(filesRoutes);
  app.use(printJobsRoutes);
  app.use(paymentsRoutes);
  app.use(kiosksRoutes);
  app.use("/admin", adminRoutes);

  app.use(errorMiddleware);

  return app;
}
