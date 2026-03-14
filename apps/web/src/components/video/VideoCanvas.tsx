"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { useCanvasCompositor } from "@/hooks/useCanvasCompositor";
import { getStopwatchBounds } from "@/lib/stopwatch/renderer";
import { Play, Pause, RotateCcw } from "lucide-react";

export function VideoCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    videoUrl,
    videoFile,
    stopwatchConfig,
    detectedSignalTime,
    startTime,
    updateStopwatchConfig,
    setVideoMetadata,
    setCurrentVideoTime,
    pendingVideoSeek,
    clearPendingSeek,
  } = useEditorStore();
  const { start, stop, render } = useCanvasCompositor(canvasRef, videoRef);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHoveringStopwatch, setIsHoveringStopwatch] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      start();
    };
    const onPause = () => {
      setIsPlaying(false);
      stop();
      render();
    };
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setCurrentVideoTime(video.currentTime);
      if (!isPlaying) render();
    };
    const onLoadedMetadata = () => {
      setDuration(video.duration);
      setVideoMetadata({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
        name: videoFile?.name ?? "video",
      });
    };
    // loadeddata fires when the first frame is available for drawing
    const onLoadedData = () => render();
    const onSeeked = () => render();

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("seeked", onSeeked);

    // If video already has frame data (e.g. re-mount), render immediately
    if (video.readyState >= 2) render();

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("seeked", onSeeked);
      stop();
    };
  }, [start, stop, render, isPlaying, setVideoMetadata, setCurrentVideoTime, videoFile]);

  // Seek video when detectedSignalTime changes (waveform click or auto-detect)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || detectedSignalTime === null) return;
    video.pause();
    video.currentTime = detectedSignalTime;
  }, [detectedSignalTime]);

  // Seek video when pendingVideoSeek is set (from SplitsPanel fine-tune buttons)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || pendingVideoSeek === null) return;
    const seekTarget = pendingVideoSeek;
    const onSeeked = () => {
      setCurrentTime(seekTarget);
      setCurrentVideoTime(seekTarget);
      video.removeEventListener("seeked", onSeeked);
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = seekTarget;
    clearPendingSeek();
    return () => {
      video.removeEventListener("seeked", onSeeked);
    };
  }, [pendingVideoSeek, clearPendingSeek, setCurrentVideoTime]);

  useEffect(() => {
    if (!isPlaying) render();
  }, [stopwatchConfig, startTime, render, isPlaying]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  const restart = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play();
  }, []);

  const handleSeekBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current;
      if (!video || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      video.currentTime = ratio * duration;
    },
    [duration],
  );

  // Convert DOM coordinates to canvas coordinates,
  // accounting for object-contain letterboxing offset.
  const domToCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const canvasAspect = canvas.width / canvas.height;
    const elementAspect = rect.width / rect.height;

    let contentWidth: number, contentHeight: number, offsetX: number, offsetY: number;
    if (canvasAspect > elementAspect) {
      contentWidth = rect.width;
      contentHeight = rect.width / canvasAspect;
      offsetX = 0;
      offsetY = (rect.height - contentHeight) / 2;
    } else {
      contentHeight = rect.height;
      contentWidth = rect.height * canvasAspect;
      offsetX = (rect.width - contentWidth) / 2;
      offsetY = 0;
    }

    const scaleX = canvas.width / contentWidth;
    const scaleY = canvas.height / contentHeight;
    const mx = (clientX - rect.left - offsetX) * scaleX;
    const my = (clientY - rect.top - offsetY) * scaleY;
    return { mx, my };
  }, []);

  // Shared pointer-down logic (mouse & touch)
  const handlePointerDown = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const coords = domToCanvas(clientX, clientY);
      if (!coords) return;
      const { mx, my } = coords;

      const video = videoRef.current;
      if (!video) return;
      const elapsed = startTime !== null ? Math.max(0, video.currentTime - startTime) : 0;
      const bounds = getStopwatchBounds(ctx, stopwatchConfig, elapsed);
      if (
        mx >= bounds.x &&
        mx <= bounds.x + bounds.width &&
        my >= bounds.y &&
        my <= bounds.y + bounds.height
      ) {
        setIsDragging(true);
        dragStartRef.current = { x: mx, y: my };
      } else {
        togglePlay();
      }
    },
    [startTime, stopwatchConfig, togglePlay, domToCanvas],
  );

  // Shared pointer-move logic (mouse & touch)
  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const coords = domToCanvas(clientX, clientY);
      if (!coords) return;
      const { mx, my } = coords;

      if (isDragging && dragStartRef.current) {
        const dx = (mx - dragStartRef.current.x) / canvas.width;
        const dy = (my - dragStartRef.current.y) / canvas.height;

        updateStopwatchConfig({
          position: {
            x: Math.max(0, Math.min(1, stopwatchConfig.position.x + dx)),
            y: Math.max(0, Math.min(1, stopwatchConfig.position.y + dy)),
          },
        });
        dragStartRef.current = { x: mx, y: my };
      } else {
        const ctx = canvas.getContext("2d");
        const video = videoRef.current;
        if (ctx && video) {
          const elapsed = startTime !== null ? Math.max(0, video.currentTime - startTime) : 0;
          const bounds = getStopwatchBounds(ctx, stopwatchConfig, elapsed);
          setIsHoveringStopwatch(
            mx >= bounds.x &&
              mx <= bounds.x + bounds.width &&
              my >= bounds.y &&
              my <= bounds.y + bounds.height,
          );
        }
      }
    },
    [isDragging, stopwatchConfig, startTime, updateStopwatchConfig, domToCanvas],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setIsHoveringStopwatch(false);
    dragStartRef.current = null;
  }, []);

  // Mouse handlers
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => handlePointerDown(e.clientX, e.clientY),
    [handlePointerDown],
  );
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => handlePointerMove(e.clientX, e.clientY),
    [handlePointerMove],
  );

  // Touch handlers
  const handleCanvasTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      handlePointerDown(t.clientX, t.clientY);
    },
    [handlePointerDown],
  );
  const handleCanvasTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      handlePointerMove(t.clientX, t.clientY);
    },
    [handlePointerMove],
  );
  const handleCanvasTouchEnd = useCallback(() => handlePointerUp(), [handlePointerUp]);

  const formatTimeDisplay = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-3 w-full flex-1 min-h-0">
      {/* Video area */}
      <div className="relative flex-1 min-h-0 bg-black rounded-xl overflow-hidden border border-border">
        <video
          ref={videoRef}
          src={videoUrl ?? undefined}
          className="w-full h-full object-contain"
          playsInline
          preload="auto"
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-contain ${isDragging ? "cursor-grabbing" : isHoveringStopwatch ? "cursor-grab" : "cursor-default"}`}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handleCanvasTouchStart}
          onTouchMove={handleCanvasTouchMove}
          onTouchEnd={handleCanvasTouchEnd}
        />
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-3 px-1 py-1.5 bg-surface-raised/50 rounded-lg">
        <div className="flex items-center gap-1">
          <button
            onClick={restart}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>

        {/* Custom seek bar */}
        <div
          className="flex-1 h-6 flex items-center cursor-pointer group"
          onClick={handleSeekBarClick}
        >
          <div className="relative w-full h-1.5 bg-white/20 rounded-full group-hover:h-2 transition-all">
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            <div
              className="absolute top-1/2 w-3.5 h-3.5 bg-primary rounded-full shadow-[0_0_8px_rgba(6,182,212,0.5)] opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                left: `${duration ? (currentTime / duration) * 100 : 0}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
        </div>

        <span className="text-[11px] text-muted-foreground font-mono tabular-nums min-w-[70px] text-right">
          {formatTimeDisplay(currentTime)} / {formatTimeDisplay(duration)}
        </span>
      </div>
    </div>
  );
}
