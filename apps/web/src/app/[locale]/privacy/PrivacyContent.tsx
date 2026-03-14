"use client";

import { useTranslation } from "react-i18next";

export function PrivacyContent() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-foreground/80">
      <h1 className="mb-8 text-2xl font-bold text-foreground">{t("privacy.title")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("privacy.lastUpdated")}</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("privacy.introTitle")}</h2>
          <p>{t("privacy.introBody")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {t("privacy.collectionTitle")}
          </h2>
          <p>{t("privacy.collectionBody")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("privacy.accessTitle")}</h2>
          <p>{t("privacy.accessBody")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>{t("privacy.accessPhotoLibrary")}</li>
            <li>{t("privacy.accessMicrophone")}</li>
          </ul>
          <p className="mt-2">{t("privacy.accessNote")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {t("privacy.paymentTitle")}
          </h2>
          <p>{t("privacy.paymentBody")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>{t("privacy.paymentStripe")}</li>
            <li>{t("privacy.paymentRevenueCat")}</li>
          </ul>
          <p className="mt-2">{t("privacy.paymentNote")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {t("privacy.thirdPartyTitle")}
          </h2>
          <p>{t("privacy.thirdPartyBody")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {t("privacy.contactTitle")}
          </h2>
          <p>{t("privacy.contactBody")}</p>
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
