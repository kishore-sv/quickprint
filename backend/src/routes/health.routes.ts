import { Router } from "express";
import { ok } from "../utils/respond";

export const healthRoutes = Router();

healthRoutes.get("/health", (_req, res) => {
  ok(res, { status: "ok" });
});
