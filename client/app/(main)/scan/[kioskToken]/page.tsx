"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LinkButton } from "@/components/ui/link-button";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch, apiFetchPublic, ensureGuestSession } from "@/lib/api";
import { pageMaxWidthClass } from "@/lib/layout";
import type { Kiosk } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function KioskScanLandingPage() {
  const router = useRouter();
  const params = useParams();
  const kioskToken = typeof params.kioskToken === "string" ? params.kioskToken : "";
  const [loading, setLoading] = useState(true);
  const [kiosk, setKiosk] = useState<Kiosk | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kioskToken) {
      setError("Kiosk unavailable");
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        await ensureGuestSession();
        const k = await apiFetchPublic<Kiosk>(`/kiosks/${encodeURIComponent(kioskToken)}`);
        await apiFetch(`/kiosks/${encodeURIComponent(kioskToken)}/session`, { method: "POST" });
        if (cancelled) return;
        setKiosk(k);
        router.replace(`/scan?connect=${encodeURIComponent(kioskToken)}`);
      } catch {
        if (!cancelled) setError("Kiosk unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [kioskToken, router]);

  if (loading) {
    return (
      <div className={cn("flex flex-col items-center gap-3 py-16", pageMaxWidthClass)}>
        <Spinner />
        <p className="text-sm text-muted-foreground">Connecting to kiosk…</p>
      </div>
    );
  }

  if (error || !kiosk) {
    return (
      <div className={cn("flex flex-col gap-4 py-16 text-center", pageMaxWidthClass)}>
        <h1 className="font-heading text-xl font-semibold">Kiosk unavailable</h1>
        <p className="text-sm text-muted-foreground">
          This kiosk link is invalid or inactive. Try scanning the QR again.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6 py-10", pageMaxWidthClass)}>
      <div className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">You are at</p>
        <h1 className="font-heading text-2xl font-bold tracking-tight">{kiosk.name}</h1>
      </div>
      <LinkButton href="/scan" size="lg" className="w-full">
        View print queue
      </LinkButton>
    </div>
  );
}
