"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

/** Redirects signed-in users to /home; crawlers and guests see the landing page. */
export function LandingAuthRedirect() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    if (session?.session) {
      router.replace("/home");
    }
  }, [isPending, session, router]);

  return null;
}
