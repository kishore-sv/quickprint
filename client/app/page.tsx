import { LandingPage } from "@/components/landing/landing-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "QuickPrint – Fast Self-Service Printing",
  description:
    "Upload your document, choose print settings, pay online, and collect from a QuickPrint self-service kiosk near you.",
  path: "/",
});

export default function HomePage() {
  return <LandingPage />;
}
