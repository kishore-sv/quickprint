import { AppShell } from "@/components/app-shell/app-shell";
import { AuthGuard } from "@/components/app-shell/auth-guard";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
