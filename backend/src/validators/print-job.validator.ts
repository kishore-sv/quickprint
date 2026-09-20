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

export const printDocumentSchema = printSettingsSchema.extend({
  saved_file_id: z.string().uuid(),
});

export const printJobCreateSchema = z.object({
  documents: z.array(printDocumentSchema).min(1).max(20),
  save_file: z.boolean().optional(),
});

/** Legacy single-file create */
export const printJobCreateLegacySchema = printSettingsSchema.extend({
  saved_file_id: z.string().uuid(),
});

export const printJobUpdateSchema = z.object({
  documents: z.array(printDocumentSchema).min(1).max(20),
  save_file: z.boolean().optional(),
});

export const printJobReleaseSchema = z.object({
  kiosk_code: z.string().min(1),
});

export type PrintSettingsInput = z.infer<typeof printSettingsSchema>;
export type PrintDocumentInput = z.infer<typeof printDocumentSchema>;
