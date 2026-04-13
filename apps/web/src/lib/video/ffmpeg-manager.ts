import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

class FFmpegManager {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;
  private loading: Promise<FFmpeg> | null = null;

  async load(onProgress?: (progress: number) => void): Promise<FFmpeg> {
    if (this.ffmpeg && this.loaded) return this.ffmpeg;
    if (this.loading) return this.loading;

    this.loading = this._load(onProgress);
    try {
      const result = await this.loading;
      return result;
    } finally {
      this.loading = null;
    }
  }

  private async _load(onProgress?: (progress: number) => void): Promise<FFmpeg> {
    this.ffmpeg = new FFmpeg();

    this.ffmpeg.on("progress", ({ progress }) => {
      onProgress?.(Math.round(progress * 100));
    });

    // Use multi-threaded core when SharedArrayBuffer is available (requires COOP/COEP)
    const mtAvailable = typeof SharedArrayBuffer !== "undefined";
    const defaultBase = mtAvailable
      ? "https://pub-22903ca2ced04f30b26d6f3838248897.r2.dev/ffmpeg-mt"
      : "https://pub-22903ca2ced04f30b26d6f3838248897.r2.dev/ffmpeg";
    const baseURL = process.env.NEXT_PUBLIC_FFMPEG_BASE_URL ?? defaultBase;

    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript");
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm");
    const workerURL = mtAvailable
      ? await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, "text/javascript")
      : undefined;

    await this.ffmpeg.load(workerURL ? { coreURL, wasmURL, workerURL } : { coreURL, wasmURL });

    this.loaded = true;
    return this.ffmpeg;
  }

  async writeFile(name: string, data: Uint8Array | string): Promise<void> {
    const ffmpeg = await this.load();
    await ffmpeg.writeFile(name, data);
  }

  async readFile(name: string): Promise<Uint8Array> {
    const ffmpeg = await this.load();
    const data = await ffmpeg.readFile(name);
    return data as Uint8Array;
  }

  async exec(args: string[]): Promise<void> {
    const ffmpeg = await this.load();
    await ffmpeg.exec(args);
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

export const ffmpegManager = new FFmpegManager();
export { fetchFile };
