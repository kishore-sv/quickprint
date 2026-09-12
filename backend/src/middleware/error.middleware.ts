import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      detail: err.message,
      code: err.code,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  logger.error({ err }, "Unhandled error");
  const message =
    process.env.NODE_ENV === "production" ? "Internal server error" : String(err);
  res.status(500).json({
    success: false,
    detail: message,
    code: "INTERNAL_ERROR",
    error: { code: "INTERNAL_ERROR", message },
  });
}
