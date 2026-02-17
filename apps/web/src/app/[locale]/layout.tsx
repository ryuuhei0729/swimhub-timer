import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { I18nProvider } from "@/components/I18nProvider";
import {
  supportedLocales,
  i18nResources,
  type SupportedLocale,
} from "@split-sync/i18n";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html lang={locale} className="h-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          async
          src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      >
        <I18nProvider locale={locale as SupportedLocale}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
