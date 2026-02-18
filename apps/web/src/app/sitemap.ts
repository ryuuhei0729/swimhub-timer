import type { MetadataRoute } from "next";
import { supportedLocales } from "@swimhub-timer/i18n";

export const dynamic = "force-static";

const baseUrl = "https://timer.swim-hub.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = supportedLocales.flatMap((locale) => [
    {
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: locale === "ja" ? 1 : 0.9,
    },
    {
      url: `${baseUrl}/${locale}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ]);

  return pages;
}
