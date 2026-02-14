export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  name: string;
}

export type ExportResolution = "720" | "1080" | "original";

export interface ExportSettings {
  resolution: ExportResolution;
}
