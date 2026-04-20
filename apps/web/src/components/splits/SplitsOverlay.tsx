"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SplitTime } from "@swimhub-timer/shared";
import { formatTime } from "@swimhub-timer/shared";

interface SplitsOverlayProps {
  visible: boolean;
  splitTimes: SplitTime[];
  finishTime: number | null;
  onClose: () => void;
}

type TabId = "byDistance" | "allLap";

interface AllLapRow {
  fromDistance: number;
  toDistance: number;
  lapTime: number;
}

/**
 * Compute lap rows from split times.
 * Assumes splitTimes is already sorted by distance ascending.
 */
function computeAllLaps(splitTimes: SplitTime[]): AllLapRow[] {
  if (splitTimes.length === 0) return [];
  const rows: AllLapRow[] = [];

  let prevDistance = 0;
  let prevTime = 0;

  for (const split of splitTimes) {
    rows.push({
      fromDistance: prevDistance,
      toDistance: split.distance,
      lapTime: split.time - prevTime,
    });
    prevDistance = split.distance;
    prevTime = split.time;
  }

  return rows;
}

export function SplitsOverlay({ visible, splitTimes, finishTime, onClose }: SplitsOverlayProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("byDistance");

  if (!visible) return null;

  const sorted = [...splitTimes].sort((a, b) => a.distance - b.distance);
  const allLaps = computeAllLaps(sorted);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3 border-b border-border">
        <h2 className="text-base font-bold text-foreground">{t("splits.overlay.title")}</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t("common.close")}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex px-5 pt-3 gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("byDistance")}
          className={[
            "px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors",
            activeTab === "byDistance"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {t("splits.overlay.tabByDistance")}
        </button>
        <button
          onClick={() => setActiveTab("allLap")}
          className={[
            "px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors",
            activeTab === "allLap"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {t("splits.overlay.tabAllLap")}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            {t("splits.overlay.noSplits")}
          </p>
        ) : activeTab === "byDistance" ? (
          <div>
            {/* Table header */}
            <div className="flex items-center px-2 py-2 bg-surface-raised rounded-lg mb-1">
              <span className="w-[72px] text-[10px] font-bold uppercase text-muted-foreground px-1">
                {t("splits.distancePlaceholder")}
              </span>
              <span className="flex-1 text-[10px] font-bold uppercase text-muted-foreground px-1">
                {t("splits.overlay.splitTime")}
              </span>
              <span className="w-20 text-right text-[10px] font-bold uppercase text-muted-foreground px-1">
                {t("splits.overlay.lapHeader")}
              </span>
            </div>
            {/* Table rows */}
            {sorted.map((split) => (
              <div
                key={split.distance}
                className="flex items-center px-2 py-2 border-b border-border"
              >
                <span className="w-[72px] text-sm font-bold font-mono text-primary tabular-nums px-1">
                  {split.distance}m
                </span>
                <span className="flex-1 text-sm font-mono tabular-nums text-foreground px-1">
                  {formatTime(split.time)}
                </span>
                <span className="w-20 text-right text-sm font-mono tabular-nums text-foreground px-1">
                  {split.lapTime !== null ? formatTime(split.lapTime) : "-"}
                </span>
              </div>
            ))}
            {/* Final row */}
            {finishTime !== null && (
              <div className="flex items-center px-2 py-2 mt-1 bg-primary/10 rounded-lg">
                <span className="w-[72px] text-sm font-bold font-mono text-primary tabular-nums px-1">
                  {t("splits.finalTime")}
                </span>
                <span className="flex-1 text-sm font-bold font-mono tabular-nums text-primary px-1">
                  {formatTime(finishTime)}
                </span>
                <span className="w-20 text-right text-sm font-mono tabular-nums text-foreground px-1">
                  -
                </span>
              </div>
            )}
          </div>
        ) : (
          <div>
            {allLaps.map((lap, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-2 py-2 border-b border-border"
              >
                <span className="text-sm text-muted-foreground">
                  {lap.fromDistance}m - {lap.toDistance}m
                </span>
                <span className="text-sm font-mono font-semibold tabular-nums text-foreground">
                  {formatTime(lap.lapTime)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
