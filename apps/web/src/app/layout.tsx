import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://split-sync.swim-hub.app";
const title = "SplitSync – 水泳レース動画にストップウォッチを自動オーバーレイ";
const description =
  "水泳のレース動画にストップウォッチを自動でオーバーレイ。スタート信号を音声検出し、ラップタイムを動画上に表示・書き出しできる無料Webツールです。";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  keywords: [
    "水泳",
    "ストップウォッチ",
    "レース動画",
    "タイム計測",
    "オーバーレイ",
    "swimming",
    "stopwatch",
    "race video",
    "SplitSync",
  ],
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "SplitSync",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
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

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "SplitSync",
    url: siteUrl,
    description,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "JPY",
    },
    inLanguage: "ja",
  };

  return (
    <html lang="ja" className="h-full">
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
        {children}
      </body>
    </html>
  );
}
