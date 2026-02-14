"use client";

import { useCallback } from "react";
import { useEditorStore } from "@/stores/editor-store";
import type { VideoMetadata } from "@/types/video";
import { SUPPORTED_VIDEO_TYPES } from "@/lib/constants";

export function useVideoFile() {
  const { setVideoFile, setVideoMetadata, videoUrl, videoFile, videoMetadata } =
    useEditorStore();

  const handleFile = useCallback(
    (file: File) => {
      if (!SUPPORTED_VIDEO_TYPES.includes(file.type)) {
        throw new Error(
          `Unsupported video format: ${file.type}. Supported: MP4, MOV, WebM`
        );
      }
      setVideoFile(file);
    },
    [setVideoFile]
  );

  const loadMetadata = useCallback(
    (video: HTMLVideoElement) => {
      const metadata: VideoMetadata = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
        name: videoFile?.name ?? "video",
      };
      setVideoMetadata(metadata);
    },
    [videoFile, setVideoMetadata]
  );

  return { handleFile, loadMetadata, videoUrl, videoFile, videoMetadata };
}
