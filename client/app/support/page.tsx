import { SupportPageContent } from "@/components/support/support-page-content";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Help & Support",
  description:
    "Get help with QuickPrint - contact support by phone or email, and find answers to common questions about printing, payments, and refunds.",
  path: "/support",
});

export default function SupportPage() {
  return <SupportPageContent />;
}
