"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { pageMaxWidthClass } from "@/lib/layout";

export function TopBar() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const isGuest = (user as { isAnonymous?: boolean } | undefined)?.isAnonymous ?? !user?.email;

  const displayName = isGuest ? "Guest" : user?.name ?? user?.email ?? "Account";
  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : isGuest
      ? "G"
      : "?";

  return (
    <header
      className="fixed top-0 right-0 left-0 z-40 border-b bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70"
    >
      <div className={`flex items-center justify-between px-4 py-3 ${pageMaxWidthClass}`}>
        <Button
          variant="link"
          size="sm"
          nativeButton={false}
          render={<Link href="/home" />}
          className="font-heading h-auto p-0 text-lg font-semibold tracking-tight no-underline hover:no-underline"
        >
          QuickPrint
        </Button>
        <div className="flex items-center gap-2">
          <span className="max-w-[120px] truncate text-sm text-muted-foreground">{displayName}</span>
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void authClient.signOut();
              window.location.href = "/sign-in";
            }}
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
