import { Anton, Geist_Mono, Inter, Roboto } from "next/font/google";
import "./globals.css";
import { SiteJsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { rootMetadata } from "@/lib/seo";

const antonLogo = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-logo",
});

const robotoHeading = Roboto({ subsets: ["latin"], variable: "--font-heading" });

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = rootMetadata;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistMono.variable,
        "font-sans",
        inter.variable,
        robotoHeading.variable,
        antonLogo.variable
      )}
      suppressHydrationWarning
    >
      <body className="flex h-dvh max-h-dvh flex-col overflow-hidden selection:bg-primary selection:text-primary-foreground">
        <SiteJsonLd />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
