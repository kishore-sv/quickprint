import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell/app-shell";
import { AuthGuard } from "@/components/app-shell/auth-guard";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  robots: PRIVATE_ROBOTS,
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
