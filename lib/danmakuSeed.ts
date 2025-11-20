export type SeedDanmaku = {
  text: string;
  time: number;
  mode?: "rtl" | "ltr" | "top" | "bottom";
  style?: Partial<CSSStyleDeclaration>;
};

export const COLOR_POOL = [
  "#FF6B6B",
  "#FFD93D",
  "#6BCB77",
  "#4D96FF",
  "#F473B9",
  "#C77DFF",
  "#F28482",
  "#39A7FF",
  "#6C63FF",
  "#FF7F3F",
];

const MODE_POOL: Array<"rtl" | "ltr" | "top" | "bottom"> = [
  "rtl",
  "rtl",
  "rtl",
  "ltr",
  "top",
  "bottom",
];

export const VIDEO_DURATION_SECONDS = 9 * 60 + 56; // 9 分 56 秒 ≈ 596 秒
export const TOTAL_MINUTES = Math.ceil(VIDEO_DURATION_SECONDS / 60);
const COMMENTS_PER_MINUTE = 120;

const TEXT_TEMPLATES = [
  "快看！第 {id} 波弹幕",
  "测试弹幕 {id}",
  "气氛拉满 {id}",
  "彩虹弹幕 {id}",
  "剧情推进中 {id}",
  "音乐动起来 {id}",
  "弹幕打卡 {id}",
  "高能预警 {id}",
  "欢迎围观 {id}",
  "笑点 +{mod}",
];

function createMinuteChunk(minute: number): SeedDanmaku[] {
  const start = minute * 60;
  return Array.from({ length: COMMENTS_PER_MINUTE }, (_, index) => {
    const globalId = minute * COMMENTS_PER_MINUTE + index + 1;
    const jitter = Math.random() * 60;
    const time = Math.min(start + jitter, VIDEO_DURATION_SECONDS - 0.1);
    const template = TEXT_TEMPLATES[index % TEXT_TEMPLATES.length];

    return {
      text: template
        .replace("{id}", String(globalId))
        .replace("{mod}", String((globalId % 5) + 1)),
      time: Number(time.toFixed(2)),
      mode: MODE_POOL[index % MODE_POOL.length],
      style: {
        fontSize: `${18 + (index % 12)}px`,
        color: COLOR_POOL[index % COLOR_POOL.length],
        fontWeight: index % 7 === 0 ? "bold" : undefined,
        textShadow: index % 9 === 0 ? "0 0 6px rgba(0,0,0,0.45)" : undefined,
      },
    };
  });
}

export function fetchDanmakuChunk(minute: number): Promise<SeedDanmaku[]> {
  if (minute < 0 || minute >= TOTAL_MINUTES) {
    return Promise.resolve([]);
  }

  return new Promise((resolve) => {
    const latency = 200 + Math.random() * 200;
    setTimeout(() => {
      resolve(createMinuteChunk(minute));
    }, latency);
  });
}
