import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { I18nProvider } from "@/components/I18nProvider";
import {
  supportedLocales,
  i18nResources,
  type SupportedLocale,
} from "@split-sync/i18n";

const siteUrl = "https://split-sync.swim-hub.app";

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = i18nResources[locale as SupportedLocale].translation;

  return {
    title: t.meta.title,
    description: t.meta.description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ja: "/ja",
        en: "/en",
      },
    },
    keywords: [...t.meta.keywords],
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      url: siteUrl,
      siteName: "SplitSync",
      locale: t.meta.ogLocale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t.meta.title,
      description: t.meta.description,
    },
    icons: {
      icon: "/icon.svg",
      apple: "/apple-touch-icon.png",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const t = i18nResources[locale as SupportedLocale].translation;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "SplitSync",
    url: siteUrl,
    description: t.meta.description,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "JPY",
    },
    inLanguage: locale,
  };

  return (
    <I18nProvider locale={locale as SupportedLocale}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Script
        async
        src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"
        strategy="afterInteractive"
      />
      {children}
    </I18nProvider>
  );
}
