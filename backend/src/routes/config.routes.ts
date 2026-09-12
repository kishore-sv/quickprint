import { Router } from "express";
import { getActiveRates } from "../services/pricing.service";
import { ok } from "../utils/respond";

export const configRoutes = Router();

configRoutes.get("/config/pricing", async (_req, res, next) => {
  try {
    const rates = await getActiveRates();
    ok(res, {
      bw_per_sheet_paise: rates.bwPaise,
      color_per_sheet_paise: rates.colorPaise,
      currency: rates.currency,
      bw_per_sheet_rupees: rates.bwPaise / 100,
      color_per_sheet_rupees: rates.colorPaise / 100,
    });
  } catch (e) {
    next(e);
  }
});
