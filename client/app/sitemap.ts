import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
    },
    {
      url: `${SITE_URL}/terms`,
    },
    {
      url: `${SITE_URL}/policy`,
    },
    {
      url: `${SITE_URL}/refunds`,
    },
    {
      url: `${SITE_URL}/support`,
    },
  ];
}
