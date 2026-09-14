import type { Metadata } from "next";
import { AuthLayoutClient } from "@/app/(auth)/auth-layout-client";
import { AppProviders } from "@/components/providers/app-providers";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  robots: PRIVATE_ROBOTS,
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <AuthLayoutClient>{children}</AuthLayoutClient>
    </AppProviders>
  );
}
