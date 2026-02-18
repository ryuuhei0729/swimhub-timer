import { defaultLocale } from "@swimhub-timer/i18n";
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
