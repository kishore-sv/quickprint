/**
 * Simple API latency benchmark. Requires a running API and auth.
 *
 * Usage:
 *   API_URL=http://localhost:8000 AUTH_HEADER="Authorization: Bearer <token>" bun run src/scripts/bench-api.ts
 * Optional: PRINT_JOB_ID, KIOSK_TOKEN for detail routes.
 */

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const AUTH_HEADER = process.env.AUTH_HEADER;
const PRINT_JOB_ID = process.env.PRINT_JOB_ID;
const KIOSK_TOKEN = process.env.KIOSK_TOKEN;
const RUNS = Number(process.env.BENCH_RUNS ?? "5");

async function timedFetch(path: string, auth = true): Promise<number> {
  const headers: HeadersInit = {};
  if (auth && AUTH_HEADER) {
    headers.Authorization = AUTH_HEADER.startsWith("Bearer ")
      ? AUTH_HEADER
      : `Bearer ${AUTH_HEADER}`;
  }
  const start = performance.now();
  const res = await fetch(`${API_URL}${path}`, {
    headers: auth ? headers : undefined,
    credentials: auth ? "include" : "omit",
  });
  await res.arrayBuffer();
  const ms = performance.now() - start;
  if (!res.ok) {
    console.warn(`  ${path} → HTTP ${res.status} (${ms.toFixed(1)} ms)`);
  }
  return ms;
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

async function bench(label: string, path: string, auth = true) {
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    times.push(await timedFetch(path, auth));
  }
  console.log(`${label}: p50=${median(times).toFixed(1)} ms (runs=${RUNS})`);
}

async function main() {
  console.log(`Benchmark ${API_URL} (runs=${RUNS})\n`);

  await bench("GET /health", "/health", false);
  await bench("GET /config/pricing", "/config/pricing", false);

  if (!AUTH_HEADER) {
    console.log("\nSet AUTH_HEADER to benchmark authenticated routes.");
    return;
  }

  await bench("GET /me", "/me");
  await bench("GET /print-jobs?view=active&limit=20", "/print-jobs?view=active&limit=20");
  await bench("GET /me/print-jobs?page=1&limit=20", "/me/print-jobs?page=1&limit=20");
  await bench("GET /files", "/files");

  if (PRINT_JOB_ID) {
    await bench("GET /print-jobs/:id", `/print-jobs/${PRINT_JOB_ID}`);
  }
  if (KIOSK_TOKEN) {
    await bench("GET /kiosks/:token", `/kiosks/${encodeURIComponent(KIOSK_TOKEN)}`, false);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
