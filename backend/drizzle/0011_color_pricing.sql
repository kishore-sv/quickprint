-- Raise color single-sided rate to ₹10/sheet (1000 paise).
UPDATE "pricing_rules"
SET "color_per_sheet_paise" = 1000
WHERE "is_active" = true;
