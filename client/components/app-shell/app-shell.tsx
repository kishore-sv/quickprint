import { BottomNav } from "./bottom-nav";
import { TopBar } from "./top-bar";
import { pageMaxWidthClass } from "@/lib/layout";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`relative flex h-dvh max-h-dvh w-full min-w-0 flex-col overflow-hidden bg-background ${pageMaxWidthClass}`}
    >
      <TopBar />
      <main
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto scroll-smooth overscroll-y-contain px-4 pt-[calc(3.5rem+0.5rem)] pb-[calc(3.5rem+env(safe-area-inset-bottom))] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
