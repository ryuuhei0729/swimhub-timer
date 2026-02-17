"use client";

import { useParams } from "next/navigation";

export function useLocalePath() {
  const params = useParams();
  const locale = params.locale as string;
  return (path: string) => `/${locale}${path === "/" ? "" : path}`;
}
