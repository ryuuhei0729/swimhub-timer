"use client";

import { useEditorStore } from "@/stores/editor-store";
import { VideoImporter } from "@/components/video/VideoImporter";
import { VideoCanvas } from "@/components/video/VideoCanvas";
import { SignalDetector } from "@/components/audio/SignalDetector";
import { StopwatchDesigner } from "@/components/stopwatch/StopwatchDesigner";
import { ExportDialog } from "@/components/export/ExportDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SplitsPanel } from "@/components/splits/SplitsPanel";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ArrowRight, RotateCcw, Waves, Palette, ListOrdered } from "lucide-react";
import { SplitSyncIcon } from "@/components/icons/SplitSyncIcon";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
  const { step, startTime, clearVideo, setStep } = useEditorStore();

  // Step 1: Import
  if (step === "import") {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <VideoImporter />
      </main>
    );
  }

  // Step 3: Export
  if (step === "export") {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <ExportDialog />
      </main>
    );
  }

  // Step 2: Detect & Design (main editor)
  return (
    <main className="h-dvh flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-border bg-surface/80 backdrop-blur-xl px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <SplitSyncIcon className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm tracking-tight">SplitSync</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium">
            <span className="px-2.5 py-1 rounded-md bg-surface-raised text-muted-foreground">
              {t("import.stepImport")}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
              {t("import.stepDetect")}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-surface-raised text-muted-foreground">
              {t("import.stepExport")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="sm"
            onClick={clearVideo}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            {t("common.new")}
          </Button>
          <Button
            size="sm"
            disabled={startTime === null}
            onClick={() => setStep("export")}
            className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan-sm"
          >
            {t("common.export")}
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Left: Video preview */}
        <div className="lg:flex-1 p-3 lg:p-5 flex flex-col gap-3 min-h-0 overflow-hidden">
          <VideoCanvas />
        </div>

        {/* Right: Controls sidebar */}
        <div className="lg:w-80 xl:w-[360px] border-t lg:border-t-0 lg:border-l border-border bg-surface/50 overflow-y-auto">
          {/* Mobile: tabs */}
          <div className="lg:hidden">
            <Tabs defaultValue="signal" className="w-full">
              <TabsList className="w-full grid grid-cols-3 bg-surface-raised m-3 mb-0">
                <TabsTrigger value="signal" className="text-xs gap-1.5">
                  <Waves className="w-3.5 h-3.5" />
                  {t("editor.tabSignal")}
                </TabsTrigger>
                <TabsTrigger value="design" className="text-xs gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  {t("editor.tabDesign")}
                </TabsTrigger>
                <TabsTrigger value="splits" className="text-xs gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5" />
                  {t("editor.tabSplits")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="signal" className="p-4">
                <SignalDetector />
              </TabsContent>
              <TabsContent value="design" className="p-4">
                <StopwatchDesigner />
              </TabsContent>
              <TabsContent value="splits" className="p-4">
                <SplitsPanel />
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop: stacked */}
          <div className="hidden lg:flex flex-col gap-0">
            <div className="p-5">
              <SignalDetector />
            </div>
            <div className="h-px bg-border mx-5" />
            <div className="p-5">
              <StopwatchDesigner />
            </div>
            <div className="h-px bg-border mx-5" />
            <div className="p-5">
              <SplitsPanel />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
