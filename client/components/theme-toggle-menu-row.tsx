"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ThemeOption = "system" | "light" | "dark";

const OPTIONS: { value: ThemeOption; icon: typeof Sun; label: string }[] = [
  { value: "system", icon: Monitor, label: "System theme" },
  { value: "light", icon: Sun, label: "Light theme" },
  { value: "dark", icon: Moon, label: "Dark theme" },
];

export function ThemeToggleMenuRow() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const active: ThemeOption =
    theme === "dark" ? "dark" : theme === "light" ? "light" : "system";

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1.5"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-sm text-foreground">Theme</span>
      <div
        className="flex items-center rounded-full border border-border/60 bg-muted/40 p-0.5"
        role="group"
        aria-label="Theme"
      >
        {OPTIONS.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={mounted && active === value}
            disabled={!mounted}
            onClick={() => setTheme(value)}
            className={cn(
              "flex size-7 items-center justify-center rounded-full transition-colors",
              mounted && active === value
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}
