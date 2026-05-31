import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const webDir = path.join(rootDir, "web-mvp");
const inputDir = path.resolve(rootDir, process.argv[2] || "web-mvp/assets/kline-scenes");
const outputFile = path.resolve(rootDir, process.argv[3] || "web-mvp/data/kline-scene-pool.json");

const rules = [
  { test: /急拉|追高|追涨|踏空/, tags: ["冲动型", "致良知关", "追涨冲动"], theme: "一念动处" },
  { test: /高位|分歧|滞涨/, tags: ["完美型", "从众型", "高位分歧"], theme: "分歧不妄动" },
  { test: /破位|不走|止损/, tags: ["扛单型", "破心中贼", "破位执行"], theme: "边界已破" },
  { test: /恐惧|割肉|急跌/, tags: ["焦虑型", "心即理", "低位恐惧"], theme: "惧念夺主" },
  { test: /震荡|乱做|反复/, tags: ["拖延型", "知行合一", "频繁交易"], theme: "心随境转" },
  { test: /缩量|回踩|确认/, tags: ["平衡型", "系统纪律", "等待确认"], theme: "等待确认" },
  { test: /突破确认|信号/, tags: ["平衡型", "事上磨", "信号确认"], theme: "信号成形" },
  { test: /假突破|诱多/, tags: ["偏执型", "赌徒型", "假突破"], theme: "不被表象牵走" }
];

const knownIds = [
  { test: /急拉|追高|追涨|踏空/, id: "rush_chase" },
  { test: /高位|分歧|滞涨/, id: "high_divergence" },
  { test: /破位|不走|止损/, id: "break_hold" },
  { test: /恐惧|割肉|急跌/, id: "fear_cut" },
  { test: /震荡|乱做|反复/, id: "shake_trade" },
  { test: /缩量|回踩/, id: "pullback" },
  { test: /突破确认|信号/, id: "breakout_confirm" },
  { test: /假突破|诱多/, id: "false_breakout" }
];

function titleFromFile(file) {
  return path
    .basename(file, path.extname(file))
    .replace(/^S?0*\d+[_-]?/i, "")
    .trim();
}

function idFromFile(file, index, title) {
  const known = knownIds.find((item) => item.test.test(title));
  if (known) return known.id;
  const match = path.basename(file).match(/^S?0*(\d+)/i);
  if (match) return `s${match[1].padStart(3, "0")}`;
  return `scene_${String(index + 1).padStart(3, "0")}`;
}

function inferMeta(title) {
  const rule = rules.find((item) => item.test.test(title));
  return {
    theme: rule?.theme || "场景训练",
    tags: rule?.tags || ["K线场景", "每日一练"]
  };
}

function toWebPath(file) {
  const absoluteFile = path.join(inputDir, file);
  return path.relative(webDir, absoluteFile).split(path.sep).join("/");
}

const files = (await readdir(inputDir))
  .filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
  .sort((a, b) => a.localeCompare(b, "zh-Hans-CN", { numeric: true }));

const scenes = files.map((file, index) => {
  const title = titleFromFile(file) || `场景${index + 1}`;
  const meta = inferMeta(title);
  return {
    id: idFromFile(file, index, title),
    title,
    theme: meta.theme,
    text: `${title}场景，练的是看到盘面时能不能先看见自己。`,
    image: toWebPath(file),
    tags: meta.tags
  };
});

await writeFile(
  outputFile,
  `${JSON.stringify({ version: "kline_scene_pool_v1", total: scenes.length, scenes }, null, 2)}\n`,
  "utf8"
);

console.log(`已生成 ${scenes.length} 个K线场景：${path.relative(rootDir, outputFile)}`);
