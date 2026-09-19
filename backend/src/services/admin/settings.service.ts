import { eq } from "drizzle-orm";
import { env } from "../../config/env";
import { db } from "../../db";
import { pricingRules } from "../../db/schema";
import { logOperationalEvent } from "../operational-log.service";

export async function getAdminSettings() {
  const rules = await db.select().from(pricingRules).orderBy(pricingRules.id);
  const active = rules.find((r) => r.isActive) ?? rules[0] ?? null;

  return {
    general: {
      currency: active?.currency ?? "INR",
      environment: env.NODE_ENV,
    },
    pricing: {
      active_rule: active
        ? {
            id: active.id,
            name: active.name,
            bw_per_sheet_paise: active.bwPerSheetPaise,
            color_per_sheet_paise: active.colorPerSheetPaise,
            currency: active.currency,
            is_active: active.isActive,
          }
        : null,
      all_rules: rules.map((r) => ({
        id: r.id,
        name: r.name,
        bw_per_sheet_paise: r.bwPerSheetPaise,
        color_per_sheet_paise: r.colorPerSheetPaise,
        currency: r.currency,
        is_active: r.isActive,
      })),
    },
  };
}

export async function updateAdminPricing(
  input: { bw_per_sheet_paise: number; color_per_sheet_paise: number },
  actorId: string
) {
  const [active] = await db
    .select()
    .from(pricingRules)
    .where(eq(pricingRules.isActive, true))
    .limit(1);

  if (active) {
    await db
      .update(pricingRules)
      .set({
        bwPerSheetPaise: input.bw_per_sheet_paise,
        colorPerSheetPaise: input.color_per_sheet_paise,
      })
      .where(eq(pricingRules.id, active.id));
  }

  await logOperationalEvent({
    level: "INFO",
    event: "SETTINGS_UPDATED",
    actor: { type: "admin", id: actorId },
    resource: { type: "pricing", id: String(active?.id ?? "default") },
    message: "Pricing updated",
    metadata: {
      bw_per_sheet_paise: input.bw_per_sheet_paise,
      color_per_sheet_paise: input.color_per_sheet_paise,
    },
  });

  return getAdminSettings();
}
