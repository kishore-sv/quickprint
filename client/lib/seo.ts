import type { Metadata } from "next";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal-meta";

export const SITE_URL = "https://quickprint.fun";
export const SITE_NAME = "QuickPrint";

export const DEFAULT_TITLE = "QuickPrint – Fast Self-Service Printing";
export const DEFAULT_DESCRIPTION =
  "Upload your document, choose your print settings, pay online, and collect your print from a QuickPrint self-service kiosk.";

export const TITLE_TEMPLATE = "%s | QuickPrint";

/** Default social preview — Next.js serves /opengraph-image */
export const DEFAULT_OG_IMAGE_PATH = "/opengraph-image";

// TODO: Add Google Search Console verification when available:
// verification: { google: "your-token" },

type PageMetadataOptions = {
  title?: string;
  description?: string;
  /** Path only, e.g. "/" or "/terms" */
  path: string;
  robots?: Metadata["robots"];
};

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${normalized}`;
}

export function createPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  robots,
}: PageMetadataOptions): Metadata {
  const canonical = absoluteUrl(path);
  const pageTitle = title ?? DEFAULT_TITLE;
  const ogImage = absoluteUrl(DEFAULT_OG_IMAGE_PATH);

  return {
    metadataBase: new URL(SITE_URL),
    title: title ? { absolute: pageTitle } : DEFAULT_TITLE,
    description,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "technology",
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url: canonical,
      siteName: SITE_NAME,
      title: pageTitle,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [ogImage],
    },
    ...(robots ? { robots } : {}),
  };
}

export const PRIVATE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
};

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    email: LEGAL_CONTACT_EMAIL,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export const rootMetadata: Metadata = {
  ...createPageMetadata({ path: "/" }),
  title: {
    default: DEFAULT_TITLE,
    template: TITLE_TEMPLATE,
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};
