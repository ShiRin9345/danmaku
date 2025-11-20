"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import Danmaku from "danmaku";
import {
  MediaController,
  MediaControlBar,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaVolumeRange,
  MediaPlayButton,
  MediaMuteButton,
  MediaPlaybackRateButton,
  MediaFullscreenButton,
} from "media-chrome/react";
import { MessageCircle } from "lucide-react";
import {
  COLOR_POOL,
  VIDEO_DURATION_SECONDS,
  fetchDanmakuChunk,
  type SeedDanmaku,
} from "@/lib/danmakuSeed";

type DanmakuPayload = SeedDanmaku;

export default function VideoPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const danmakuRef = useRef<Danmaku | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const loadedMinutesRef = useRef<Set<number>>(new Set());
  const pendingMinutesRef = useRef<Set<number>>(new Set());
  const danmakuChunksRef = useRef<Map<number, SeedDanmaku[]>>(new Map());
  const danmakuEnabledRef = useRef(true);

  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [danmakuEnabled, setDanmakuEnabled] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const socket = io({ path: "/socket.io/" });
    socketRef.current = socket;

    const initializeDanmaku = () => {
      if (!videoRef.current || !containerRef.current) return;
      danmakuRef.current?.destroy();
      danmakuRef.current = new Danmaku({
        container: containerRef.current,
        media: videoRef.current,
        engine: "dom",
        comments: [],
      });
      danmakuRef.current.resize();
    };

    if (video.readyState >= 2) {
      initializeDanmaku();
    } else {
      video.addEventListener("loadeddata", initializeDanmaku, { once: true });
    }

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("receiveDanmaku", (payload: DanmakuPayload) => {
      if (!danmakuEnabledRef.current) return;
      danmakuRef.current?.emit({
        text: payload.text,
        mode: payload.mode,
        time: payload.time,
        style: payload.style,
      });
    });

    const handleResize = () => danmakuRef.current?.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      video.removeEventListener("loadeddata", initializeDanmaku);
      window.removeEventListener("resize", handleResize);
      socket.disconnect();
      danmakuRef.current?.destroy();
    };
  }, []);

  const emitChunk = useCallback((chunk: SeedDanmaku[]) => {
    chunk.forEach((comment) => {
      danmakuRef.current?.emit({ ...comment });
    });
  }, []);

  const ensureMinuteLoaded = useCallback(
    async (minute: number) => {
      const totalMinutes = Math.ceil(VIDEO_DURATION_SECONDS / 60);
      if (minute < 0 || minute >= totalMinutes) return;
      if (
        loadedMinutesRef.current.has(minute) ||
        pendingMinutesRef.current.has(minute)
      )
        return;
      pendingMinutesRef.current.add(minute);
      try {
        const chunk = await fetchDanmakuChunk(minute);
        if (!chunk.length) return;
        loadedMinutesRef.current.add(minute);
        danmakuChunksRef.current.set(minute, chunk);
        if (danmakuEnabledRef.current) {
          emitChunk(chunk);
        }
      } finally {
        pendingMinutesRef.current.delete(minute);
      }
    },
    [emitChunk]
  );

  useEffect(() => {
    ensureMinuteLoaded(0);
    ensureMinuteLoaded(1);
  }, [ensureMinuteLoaded]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const requestChunk = () => {
      const currentMinute = Math.floor(video.currentTime / 60);
      ensureMinuteLoaded(currentMinute);
      ensureMinuteLoaded(currentMinute + 1);
    };

    const handleSeeked = () => {
      requestChunk();
    };

    video.addEventListener("timeupdate", requestChunk);
    video.addEventListener("seeked", handleSeeked);
    return () => {
      video.removeEventListener("timeupdate", requestChunk);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [ensureMinuteLoaded, emitChunk]);

  const sendDanmaku = () => {
    if (!inputValue.trim() || !socketRef.current || !videoRef.current) return;

    const payload: DanmakuPayload = {
      text: inputValue.trim(),
      time: videoRef.current.currentTime,
      mode: "rtl",
      style: {
        fontSize: "32px",
        color: COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)],
        textShadow: "0 0 6px rgba(0,0,0,0.65)",
        fontWeight: "bold",
      },
    };

    if (danmakuEnabledRef.current) {
      danmakuRef.current?.emit(payload);
    }
    socketRef.current.emit("sendDanmaku", payload);
    setInputValue("");
  };

  const toggleDanmaku = () => {
    setDanmakuEnabled((prev) => {
      const next = !prev;
      danmakuEnabledRef.current = next;
      if (next) {
        danmakuRef.current?.show();
        danmakuRef.current?.clear();
        danmakuChunksRef.current.forEach((chunk) => emitChunk(chunk));
      } else {
        danmakuRef.current?.clear();
        danmakuRef.current?.hide();
      }
      return next;
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      sendDanmaku();
    }
  };

  return (
    <div className="flex flex-col gap-6 min-h-screen items-center px-4 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold">弹幕视频演示</h1>
        <p className="text-base text-zinc-500">
          使用 Media Chrome + Danmaku 实现，包含 10000
          条预置弹幕与实时弹幕示例。
        </p>
      </div>

      <div className="w-full max-w-5xl space-y-4">
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-[28px] bg-black shadow-[0_24px_60px_rgba(15,23,42,0.45)]"
          style={{
            aspectRatio: "16 / 9",
            minHeight: "360px",
            lineHeight: "1.2",
            fontSize: "18px",
          }}
          onMouseEnter={() => setControlsVisible(true)}
          onMouseMove={() => setControlsVisible(true)}
          onMouseLeave={() => setControlsVisible(false)}
          onTouchStart={() => setControlsVisible(true)}
        >
          <MediaController
            suppressHydrationWarning
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            <video
              ref={videoRef}
              slot="media"
              suppressHydrationWarning
              className="h-full w-full object-cover"
              preload="auto"
              src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
            >
              您的浏览器不支持 HTML5 视频。
            </video>
            <div
              style={{
                position: "absolute",
                insetInline: "8%",
                bottom: 16,
                padding: "16px 20px 18px",
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 100%)",
                borderRadius: 24,
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                transform: controlsVisible
                  ? "translateY(0)"
                  : "translateY(80px)",
                opacity: controlsVisible ? 1 : 0,
                transition: "transform 0.3s ease, opacity 0.3s ease",
                pointerEvents: controlsVisible ? "auto" : "none",
              }}
            >
              <div
                style={{
                  paddingInline: "8px",
                  paddingBottom: "10px",
                }}
              >
                <MediaTimeRange />
              </div>
              <MediaControlBar>
                <MediaPlayButton />
                <MediaTimeDisplay showDuration />
                <div style={{ flex: 1 }} />
                <MediaMuteButton />
                <MediaVolumeRange />
                <MediaPlaybackRateButton />
                <button
                  type="button"
                  onClick={toggleDanmaku}
                  aria-label={danmakuEnabled ? "关闭弹幕" : "开启弹幕"}
                  style={{
                    border: "none",
                    borderRadius: "12px",
                    padding: "6px",
                    background: danmakuEnabled
                      ? "rgba(0,0,0,0.55)"
                      : "rgba(0,0,0,0.25)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "34px",
                    height: "34px",
                    cursor: "pointer",
                  }}
                >
                  <MessageCircle
                    size={16}
                    strokeWidth={2}
                    style={{ opacity: danmakuEnabled ? 1 : 0.5 }}
                  />
                </button>
                <MediaFullscreenButton />
              </MediaControlBar>
            </div>
          </MediaController>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入弹幕内容..."
              className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <button
              type="button"
              onClick={sendDanmaku}
              disabled={!isConnected || !inputValue.trim()}
              className="rounded-xl bg-blue-600 px-6 py-3 text-base font-medium text-white shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              发送弹幕
            </button>
          </div>
          <p className="text-sm text-zinc-500">
            服务状态：
            <span className={isConnected ? "text-green-500" : "text-red-500"}>
              {isConnected ? " 已连接" : " 未连接"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
