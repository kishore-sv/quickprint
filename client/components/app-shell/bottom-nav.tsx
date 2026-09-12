"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, History, Printer, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pageMaxWidthClass } from "@/lib/layout";

const links = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/print", label: "Print", icon: Printer },
  { href: "/scan", label: "Scan", icon: QrCode },
  { href: "/history", label: "History", icon: History },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
      <div
        className={cn(
          "flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]",
          pageMaxWidthClass
        )}
      >
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Button
              key={href}
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href={href} />}
              className={cn(
                "h-auto flex-1 flex-col gap-0.5 py-2 text-xs font-normal normal-case tracking-normal",
                active ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {label}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
