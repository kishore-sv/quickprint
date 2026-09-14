"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const LandingAuthRedirect = dynamic(
  () =>
    import("@/components/landing/landing-auth-redirect").then((module) => ({
      default: module.LandingAuthRedirect,
    })),
  { ssr: false }
);

export function LandingAuthRedirectDeferred() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true));
      return () => window.cancelIdleCallback(id);
    }

    const id = setTimeout(() => setReady(true), 1);
    return () => clearTimeout(id);
  }, []);

  if (!ready) return null;

  return <LandingAuthRedirect />;
}
