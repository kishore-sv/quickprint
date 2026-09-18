"use client";

import Link from "next/link";
import { QuickPrintLogo } from "@/components/quickprint-logo";
import { appCallbackUrl, authClient } from "@/lib/auth-client";
import { useGoogleProfileImage } from "@/lib/use-google-profile-image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ThemeToggleMenuRow } from "@/components/theme-toggle-menu-row";
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
  const profileImage = useGoogleProfileImage(user, isGuest);
  const email = user?.email ?? (isGuest ? "Guest account" : "No email");

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.assign(appCallbackUrl("/sign-in"));
  };

  return (
    <header
      className="fixed top-0 right-0 left-0 z-50 border-b bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70"
    >
      <div className={`flex items-center justify-between px-4 py-3 ${pageMaxWidthClass}`}>
        <Link
          className="inline-flex shrink-0 items-center no-underline hover:no-underline"
          href="/home"
          aria-label="QuickPrint home"
        >
          <QuickPrintLogo className="text-2xl" />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-8 rounded-full p-0"
                aria-label="Account menu"
              />
            }
          >
            <Avatar className="size-8">
              {profileImage ? (
                <AvatarImage
                  src={profileImage}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[100] min-w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <ThemeToggleMenuRow />
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => void handleLogout()}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
