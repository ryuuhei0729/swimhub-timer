"use client";

import { useEditorStore } from "@/stores/editor-store";
import { useVideoExport } from "@/hooks/useVideoExport";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Loader2, Check, ArrowLeft, Timer } from "lucide-react";
import type { ExportResolution } from "@split-sync/core";

export function ExportDialog() {
  const { exportSettings, setExportSettings, setStep } = useEditorStore();
  const {
    startExport,
    downloadOutput,
    isExporting,
    exportProgress,
    error,
    outputBlob,
  } = useVideoExport();

  return (
    <div className="flex flex-col gap-8 max-w-md mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-surface-raised border border-border flex items-center justify-center">
          <Timer className="w-7 h-7 text-primary" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Export Video</h2>
          <p className="text-sm text-muted-foreground">
            Create your final video with stopwatch overlay
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-6">
        {/* Quality selection */}
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Quality
          </Label>
          <Select
            value={exportSettings.resolution}
            onValueChange={(v) =>
              setExportSettings({ resolution: v as ExportResolution })
            }
          >
            <SelectTrigger className="bg-surface-raised border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="720">720p</SelectItem>
              <SelectItem value="1080">1080p (Recommended)</SelectItem>
              <SelectItem value="original">Original</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Export button or progress */}
        {!isExporting && !outputBlob && (
          <Button
            onClick={startExport}
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan h-11"
          >
            <Download className="w-4 h-4 mr-2" />
            Export MP4
          </Button>
        )}

        {isExporting && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Encoding...</span>
              </div>
              <span className="font-mono text-primary tabular-nums">
                {exportProgress}%
              </span>
            </div>
            <div className="w-full bg-surface-raised rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              This may take a few minutes depending on video length
            </p>
          </div>
        )}

        {outputBlob && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 py-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-medium text-emerald-400">Export complete</span>
            </div>
            <Button
              onClick={downloadOutput}
              size="lg"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan h-11"
            >
              <Download className="w-4 h-4 mr-2" />
              Download MP4 ({(outputBlob.size / 1024 / 1024).toFixed(1)} MB)
            </Button>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-destructive/5 border border-destructive/20 rounded-xl">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={startExport}
              className="mt-3 text-xs"
            >
              Retry
            </Button>
          </div>
        )}
      </div>

      {/* Back button */}
      <button
        onClick={() => setStep("detect")}
        className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to editor
      </button>
    </div>
  );
}
