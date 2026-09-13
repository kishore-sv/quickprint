export type PricingConfig = {
  bw_per_sheet_paise: number;
  color_per_sheet_paise: number;
  currency: string;
  bw_per_sheet_rupees: number;
  color_per_sheet_rupees: number;
};

export type SavedFile = {
  id: string;
  original_filename: string;
  file_size_bytes: number;
  page_count: number;
  retention_until: string | null;
  created_at: string;
  download_url?: string | null;
};

export type PrintJobListResponse = {
  items: PrintJob[];
  page: number;
  limit: number;
  has_more: boolean;
};

export type PrintJob = {
  id: string;
  job_number: string;
  user_id: string;
  status: string;
  payment_status: string;
  original_filename: string;
  page_count: number;
  copies: number;
  page_range: string;
  color_mode: string;
  paper_size: string;
  duplex: string;
  pages_per_sheet: number;
  order: string;
  orientation: string;
  fit_to_page: boolean;
  physical_sheets: number | null;
  amount_paise: number | null;
  currency: string;
  save_file: boolean;
  file_retention_until: string | null;
  kiosk_id: string | null;
  saved_file_id: string | null;
  created_at: string;
  paid_at: string | null;
  claimed_at: string | null;
};

export type Kiosk = {
  id: string;
  kiosk_code: string;
  public_token?: string | null;
  name: string;
  location: string | null;
  status: string;
};

export type PaymentCreateResponse = {
  razorpay_order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
};

export type PageSet = "ALL" | "ODD" | "EVEN";
export type PrintQuality = "NORMAL" | "DRAFT" | "BEST";

export type PrintSettings = {
  copies: number;
  page_range: string;
  color_mode: "BW";
  paper_size: "A4";
  duplex: "SINGLE" | "DOUBLE";
  pages_per_sheet: number;
  page_set: PageSet;
  order: "NORMAL" | "REVERSE";
  orientation: "AUTO" | "PORTRAIT" | "LANDSCAPE";
  quality: PrintQuality;
  fit_to_page: boolean;
  collate: boolean;
  save_file: boolean;
};

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}
