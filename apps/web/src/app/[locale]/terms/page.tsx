import type { Metadata } from "next";
import {
  supportedLocales,
  i18nResources,
  type SupportedLocale,
} from "@swimhub-timer/i18n";
import { TermsContent } from "./TermsContent";

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
    title: t.terms.metaTitle,
    description: t.terms.metaDescription,
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <TermsContent locale={locale} />;
}
