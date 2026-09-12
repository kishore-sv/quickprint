import { z } from "zod";

export const printSettingsSchema = z.object({
  copies: z.number().int().min(1).max(99).default(1),
  page_range: z.string().default("all"),
  color_mode: z.enum(["BW", "COLOR"]).default("BW"),
  paper_size: z.enum(["A4"]).default("A4"),
  duplex: z.enum(["SINGLE", "DOUBLE"]).default("SINGLE"),
  pages_per_sheet: z.number().int().min(1).max(16).default(1),
  order: z.enum(["NORMAL", "REVERSE"]).default("NORMAL"),
  orientation: z.enum(["AUTO", "PORTRAIT", "LANDSCAPE"]).default("AUTO"),
  fit_to_page: z.boolean().default(false),
  save_file: z.boolean().default(false),
});

export const printJobCreateSchema = printSettingsSchema.extend({
  saved_file_id: z.string().uuid(),
});

export const printJobUpdateSchema = printSettingsSchema;

export const printJobReleaseSchema = z.object({
  kiosk_code: z.string().min(1),
});

export type PrintSettingsInput = z.infer<typeof printSettingsSchema>;
