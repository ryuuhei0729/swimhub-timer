import type { Metadata } from "next";
import {
  supportedLocales,
  i18nResources,
  type SupportedLocale,
} from "@swimhub-timer/i18n";
import { PrivacyContent } from "./PrivacyContent";

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
    title: t.privacy.metaTitle,
    description: t.privacy.metaDescription,
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <PrivacyContent locale={locale} />;
}
