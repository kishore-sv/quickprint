"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";

export default function RootPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    router.replace(session?.session ? "/home" : "/sign-in");
  }, [isPending, session, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2">
      <Spinner className="size-8 text-primary" />
      <p className="text-muted-foreground text-sm">Loading…</p>
    </div>
  );
}
