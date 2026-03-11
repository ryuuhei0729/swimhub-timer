"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

export function UserMenu() {
  const { t } = useTranslation();
  const { user, plan, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const locale = (params.locale as string) || "ja";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return (
      <Link
        href={`/${locale}/login`}
        className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-muted transition-colors duration-200"
      >
        {t("auth.login")}
      </Link>
    );
  }

  const displayName = user.user_metadata?.full_name ?? user.email;

  return (
    <div className="relative z-50" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors duration-200"
      >
        <svg
          className="h-5 w-5 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
        <span className="hidden sm:inline max-w-[150px] truncate">
          {displayName}
        </span>
        <svg
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md bg-card shadow-lg ring-1 ring-border z-50">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">
              {displayName}
            </p>
            {user.email && displayName !== user.email && (
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            )}
            <span
              className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                plan === "premium"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {plan === "premium"
                ? t("auth.planPremium")
                : plan === "free"
                  ? t("auth.planFree")
                  : t("auth.planGuest")}
            </span>
          </div>
          <div className="py-1">
            <button
              onClick={async () => {
                setIsOpen(false);
                try {
                  await signOut();
                } catch (error) {
                  if (process.env.NODE_ENV !== "production") {
                    console.error("Sign out failed:", error);
                  }
                }
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors duration-200"
            >
              <svg
                className="h-4 w-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
              {t("auth.logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
