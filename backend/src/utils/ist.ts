const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Start of calendar day in Asia/Kolkata as UTC Date. */
export function istDayStart(date: Date = new Date()): Date {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate();
  return new Date(Date.UTC(y, m, d, 0, 0, 0) - IST_OFFSET_MS);
}

export function istDayEnd(date: Date = new Date()): Date {
  const start = istDayStart(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function daysAgoIst(days: number): Date {
  const start = istDayStart();
  return new Date(start.getTime() - days * 24 * 60 * 60 * 1000);
}
