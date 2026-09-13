import type { PrintJobDetail } from "@/lib/types";

/** Short two-tone chime when a print job finishes (Web Audio API, no asset file). */
export function playPrintCompleteSound() {
  if (typeof window === "undefined") return;

  try {
    const ctx = new AudioContext();
    const playTone = (frequency: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    const t = ctx.currentTime;
    playTone(523.25, t, 0.18);
    playTone(659.25, t + 0.16, 0.28);

    window.setTimeout(() => {
      void ctx.close();
    }, 600);
  } catch {
    /* autoplay or AudioContext unsupported */
  }
}

export function printPickupMessage(job: Pick<PrintJobDetail, "kiosk_code" | "kiosk_name" | "display_message">): string {
  const kiosk = job.kiosk_code ?? job.kiosk_name;
  if (kiosk) {
    return `Your print is ready at ${kiosk}. Please collect it from the tray.`;
  }
  return job.display_message ?? "Your document has been printed successfully.";
}
