"use client";

import { useEffect } from "react";
import { ensureGuestSession } from "@/lib/api";

export function GuestBootstrap({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void ensureGuestSession();
  }, []);
  return children;
}
