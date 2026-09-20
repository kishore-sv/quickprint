-- Ensure an active default pricing rule exists (B/W ₹2, Color ₹10 per sheet).
INSERT INTO "pricing_rules" ("name", "bw_per_sheet_paise", "color_per_sheet_paise", "currency", "is_active")
SELECT 'Default', 200, 1000, 'INR', true
WHERE NOT EXISTS (SELECT 1 FROM "pricing_rules" WHERE "is_active" = true);
