export type SeedDanmaku = {
  text: string;
  time?: number;
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

const VIDEO_DURATION_SECONDS = 9 * 60 + 56; // 9 分 56 秒 ≈ 596 秒
const TOTAL_COMMENTS = 1000;

function createDanmakuSeed(): SeedDanmaku[] {
  return Array.from({ length: TOTAL_COMMENTS }, (_, index) => {
    const ratio = index / TOTAL_COMMENTS;
    const baseTime = ratio * (VIDEO_DURATION_SECONDS - 5);
    const jitter = Math.random() * 5; // 让时间更自然
    const time = Number((baseTime + jitter).toFixed(2));

    const textVariants = [
      `测试弹幕 ${index + 1}`,
      `这是第 ${index + 1} 条弹幕，欢迎围观`,
      `高能预警 ${index + 1}`,
      `快看！第 ${index + 1} 波弹幕`,
      `笑点 +${(index % 5) + 1}`,
      `彩虹弹幕 ${index + 1}`,
      `弹幕打卡 ${index + 1}`,
      `剧情推进中 ${index + 1}`,
      `音乐动起来 ${index + 1}`,
      `气氛拉满 ${index + 1}`,
    ];

    return {
      text: textVariants[index % textVariants.length],
      time: Math.min(time, VIDEO_DURATION_SECONDS - 1),
      mode: MODE_POOL[index % MODE_POOL.length],
      style: {
        fontSize: `${14 + (index % 10)}px`,
        color: COLOR_POOL[index % COLOR_POOL.length],
        fontWeight: index % 7 === 0 ? "bold" : undefined,
        textShadow: index % 9 === 0 ? "0 0 6px rgba(0,0,0,0.45)" : undefined,
      },
    } satisfies SeedDanmaku;
  });
}

const DANMAKU_SEED = createDanmakuSeed();

export default DANMAKU_SEED;
