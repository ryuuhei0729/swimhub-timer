import type { Metadata } from "next";
import { supportedLocales, i18nResources, type SupportedLocale } from "@swimhub-timer/i18n";
import { SupportContent } from "./SupportContent";

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
    title: t.support.metaTitle,
    description: t.support.metaDescription,
  };
}

export default async function SupportPage({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  return <SupportContent />;
}
