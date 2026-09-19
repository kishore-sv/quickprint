import Link from "next/link";
import { QuickPrintLogo } from "@/components/quickprint-logo";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal-meta";

const footerLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
  { href: "/terms", label: "Terms" },
  { href: "/policy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
];

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/20 px-4 py-12">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <Link href="/" className="inline-flex shrink-0 items-center" aria-label="QuickPrint home">
            <QuickPrintLogo className="text-2xl" />
          </Link>
          <p className="mt-4 max-w-sm text-muted-foreground text-sm leading-relaxed">
            Self-service printing at nearby kiosks. Upload from your phone, pay online, and collect when
            ready.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="font-medium text-sm">Explore</p>
            <ul className="mt-3 space-y-2 text-sm">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium text-sm">Contact</p>
            <p className="mt-3">
              <a
                href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
              >
                {LEGAL_CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-6xl border-t pt-6 text-center text-muted-foreground text-xs md:text-left">
        © {year} QuickPrint
      </div>
    </footer>
  );
}
