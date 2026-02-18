"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supportedLocales } from "@swimhub-timer/i18n";

const localeLabels: Record<string, string> = {
  ja: "日本語",
  en: "English",
};

export function LanguageSwitcher() {
  const pathname = usePathname();

  const switchedPath = (locale: string) => {
    const segments = pathname.split("/");
    segments[1] = locale;
    return segments.join("/");
  };

  return (
    <div className="flex items-center gap-1">
      {supportedLocales.map((locale, i) => (
        <span key={locale} className="flex items-center">
          {i > 0 && <span className="text-border mx-1">|</span>}
          <Link
            href={switchedPath(locale)}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {localeLabels[locale]}
          </Link>
        </span>
      ))}
    </div>
  );
}
