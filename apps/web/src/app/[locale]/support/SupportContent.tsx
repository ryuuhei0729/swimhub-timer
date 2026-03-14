"use client";

import { useTranslation } from "react-i18next";

export function SupportContent() {
  const { t } = useTranslation();

  const faqItems = t("support.faqItems", { returnObjects: true }) as Array<{
    question: string;
    answer: string;
  }>;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-foreground/80">
      <h1 className="mb-8 text-2xl font-bold text-foreground">{t("support.heading")}</h1>

      <section className="space-y-6 text-sm leading-relaxed">
        <p>{t("support.description")}</p>

        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {t("support.emailLabel")}
          </p>
          <a
            href={`mailto:${t("support.email")}`}
            className="text-base font-semibold text-primary hover:underline"
          >
            {t("support.email")}
          </a>
          <p className="mt-2 text-xs text-muted-foreground">{t("support.responseNote")}</p>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">{t("support.faqTitle")}</h2>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <h3 className="mb-2 font-medium text-foreground">{item.question}</h3>
                <p className="text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-12">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="text-sm text-primary hover:underline"
        >
          ← {t("common.back")}
        </button>
      </div>
    </main>
  );
}
