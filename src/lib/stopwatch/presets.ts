import type { StopwatchPreset } from "@/types/stopwatch";

export const STOPWATCH_PRESETS: StopwatchPreset[] = [
  {
    id: "classic-digital",
    name: "Classic Digital",
    config: {
      fontFamily: "monospace",
      fontSize: 48,
      textColor: "#00FF00",
      backgroundColor: "rgba(0,0,0,0.8)",
      borderRadius: 4,
      padding: 12,
      position: { x: 0.95, y: 0.05 },
      anchor: "top-right",
    },
  },
  {
    id: "minimal-white",
    name: "Minimal White",
    config: {
      fontFamily: "sans-serif",
      fontSize: 36,
      textColor: "#FFFFFF",
      backgroundColor: "rgba(0,0,0,0.4)",
      borderRadius: 8,
      padding: 10,
      position: { x: 0.05, y: 0.05 },
      anchor: "top-left",
    },
  },
  {
    id: "broadcast",
    name: "Broadcast",
    config: {
      fontFamily: "sans-serif",
      fontSize: 56,
      textColor: "#FFFFFF",
      backgroundColor: "rgba(0,50,120,0.85)",
      borderRadius: 6,
      padding: 16,
      position: { x: 0.5, y: 0.92 },
      anchor: "bottom-center",
    },
  },
  {
    id: "competition-red",
    name: "Competition Red",
    config: {
      fontFamily: "monospace",
      fontSize: 44,
      textColor: "#FFFFFF",
      backgroundColor: "rgba(200,30,30,0.85)",
      borderRadius: 4,
      padding: 12,
      position: { x: 0.05, y: 0.92 },
      anchor: "bottom-left",
    },
  },
];

export const DEFAULT_STOPWATCH_CONFIG = STOPWATCH_PRESETS[0].config;
