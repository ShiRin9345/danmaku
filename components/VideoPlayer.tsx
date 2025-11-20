"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import Danmaku from "danmaku";
import danmakuSeed, { type SeedDanmaku, COLOR_POOL } from "@/lib/danmakuSeed";

type DanmakuPayload = SeedDanmaku;

export default function VideoPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const danmakuRef = useRef<Danmaku | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);

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
        comments: danmakuSeed,
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

    danmakuRef.current?.emit(payload);
    socketRef.current.emit("sendDanmaku", payload);
    setInputValue("");
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
          使用 Danmaku 官方文档方式实现，包含 1000 条预置弹幕与实时弹幕示例。
        </p>
      </div>

      <div className="w-full max-w-5xl space-y-4">
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black"
          style={{
            aspectRatio: "16 / 9",
            minHeight: "360px",
            lineHeight: "1.2",
            fontSize: "18px",
          }}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            controls
            style={{ position: "absolute" }}
            src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
          >
            您的浏览器不支持 HTML5 视频。
          </video>
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
