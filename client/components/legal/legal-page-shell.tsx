import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LEGAL_EFFECTIVE_DATE, LEGAL_LAST_UPDATED } from "@/lib/legal-meta";
import { pageMaxWidthClass } from "@/lib/layout";
import { cn } from "@/lib/utils";

type TocItem = {
  id: string;
  label: string;
};

type LegalPageShellProps = {
  title: string;
  description: string;
  toc: TocItem[];
  children: React.ReactNode;
};

export function LegalPageShell({ title, description, toc, children }: LegalPageShellProps) {
  return (
    <div className="min-h-dvh overflow-y-auto bg-muted">
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className={cn("flex items-center justify-between px-4 py-4", pageMaxWidthClass, "max-w-3xl")}>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/" />}
            className="h-auto gap-2 p-0 font-medium normal-case tracking-normal hover:bg-transparent"
          >
            <Image src="/logo.png" alt="" width={24} height={24} className="size-6 rounded-md" />
            QuickPrint
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/sign-in" />}>
            Sign in
          </Button>
        </div>
      </header>

      <main className={cn("px-4 py-8 md:py-10", pageMaxWidthClass, "max-w-3xl")}>
        <div className="rounded-xl border bg-card p-6 shadow-sm md:p-10">
          <div className="mb-8 border-b pb-6">
            <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{description}</p>
            <p className="mt-3 text-muted-foreground text-xs">
              Effective: {LEGAL_EFFECTIVE_DATE} · Last updated: {LEGAL_LAST_UPDATED}
            </p>
          </div>

          {toc.length > 0 && (
            <nav aria-label="Table of contents" className="mb-8 rounded-lg border bg-muted/40 p-4">
              <p className="mb-2 font-medium text-sm">On this page</p>
              <ol className="grid gap-1 text-sm sm:grid-cols-2">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a className="text-primary underline-offset-4 hover:underline" href={`#${item.id}`}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="space-y-8 text-sm leading-7 text-foreground/90 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-4 [&_h3]:font-medium [&_h3]:text-base [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_ul]:mt-2 [&_ul]:space-y-1">
            {children}
          </div>

          <footer className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-6 text-muted-foreground text-xs">
            <Link href="/terms" className="hover:text-foreground hover:underline">
              Terms of Service
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/policy" className="hover:text-foreground hover:underline">
              Privacy Policy
            </Link>
          </footer>
        </div>
      </main>
    </div>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2>{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
