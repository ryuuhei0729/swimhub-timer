"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export function TermsContent({ locale }: { locale: string }) {
  const { t } = useTranslation();

  const prohibitedItems = t("terms.prohibitedItems", {
    returnObjects: true,
  }) as string[];

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-foreground/80">
      <h1 className="mb-8 text-2xl font-bold text-foreground">
        {t("terms.title")}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("terms.lastUpdated")}</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {t("terms.introTitle")}
          </h2>
          <p>{t("terms.introBody")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {t("terms.serviceTitle")}
          </h2>
          <p>{t("terms.serviceBody")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {t("terms.accountTitle")}
          </h2>
          <p>{t("terms.accountBody")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {t("terms.prohibitedTitle")}
          </h2>
          <p>{t("terms.prohibitedBody")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {Array.isArray(prohibitedItems) &&
              prohibitedItems.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {t("terms.disclaimerTitle")}
          </h2>
          <p>{t("terms.disclaimerBody")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {t("terms.changesTitle")}
          </h2>
          <p>{t("terms.changesBody")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {t("terms.contactTitle")}
          </h2>
          <p>{t("terms.contactBody")}</p>
        </div>
      </section>

      <div className="mt-12">
        <Link
          href={`/${locale}`}
          className="text-sm text-primary hover:underline"
        >
          {t("terms.backToTop")}
        </Link>
      </div>
    </main>
  );
}
