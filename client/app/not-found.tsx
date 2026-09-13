import Image from "next/image";
import Link from "next/link";
import { LinkButton } from "@/components/ui/link-button";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Page not found",
  description: "The page you are looking for could not be found on QuickPrint.",
  path: "/404",
  robots: { index: false, follow: false },
});

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col overflow-y-auto bg-background">
      <header className="border-b px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 font-heading font-semibold">
          <Image src="/logo.png" alt="" width={28} height={28} className="size-7 rounded-md" />
          <Link href="/">QuickPrint</Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="font-medium text-primary text-sm">404</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          The page you are looking for does not exist or may have been moved.
        </p>
        <LinkButton href="/" className="mt-8" size="lg">
          Back to home
        </LinkButton>
      </main>
    </div>
  );
}
