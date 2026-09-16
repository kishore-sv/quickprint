import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QuickPrint Kiosk",
  robots: { index: false, follow: false },
};

export default function KioskLayout({ children }: LayoutProps<"/kiosk/[kioskCode]">) {
  return (
    <div className="h-dvh w-screen overflow-hidden bg-background">{children}</div>
  );
}
