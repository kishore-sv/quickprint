const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let loadPromise: Promise<void> | null = null;

/** Load Razorpay checkout.js on demand (avoids dozens of v2-entry chunks on upload/settings). */
export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.Razorpay) {
    return Promise.resolve();
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT_URL}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load payment SDK")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load payment SDK"));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
}
