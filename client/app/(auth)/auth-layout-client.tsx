"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";

export function AuthLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && session?.session) {
      router.replace("/home");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (session?.session) {
    return null;
  }

  return <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>;
}
