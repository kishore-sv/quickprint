import { Anton, Geist, Geist_Mono, Inter, Roboto } from "next/font/google";
import "./globals.css";
import { SiteJsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme-provider";
import { rootMetadata } from "@/lib/seo";

const antonLogo = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-logo",
});

const robotoHeading = Roboto({subsets:['latin'],variable:'--font-heading'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = rootMetadata;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable, robotoHeading.variable, antonLogo.variable)}
      suppressHydrationWarning
    >
      <body className="flex h-dvh max-h-dvh flex-col overflow-hidden selection:bg-primary selection:text-primary-foreground">
        <SiteJsonLd />
      <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
          <TooltipProvider>
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </TooltipProvider>
          </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
