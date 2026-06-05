"use client"

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react"

import {
  createLivingMirrorGrowthRecord,
  getSceneDrivenMirror,
  oneThoughtScenes,
} from "@yangming/content/one-thought"

import insightEvidences from "@/data/insight-engine/evidences.json"
import insightMirrors from "@/data/insight-engine/mirrors.json"
import insightPractices from "@/data/insight-engine/practices.json"
import insightReflections from "@/data/insight-engine/reflections.json"
import insightThoughts from "@/data/insight-engine/thoughts.json"

import type { LakeMode } from "./HeartLakeEngine"

type Stage =
  | "heartMoon"
  | "scene"
  | "thought"
  | "mirrors"
  | "thief"
  | "cycle"
  | "practice"
  | "liangzhi"
  | "seal"
  | "growth"
  | "empty"

type StageCopy = {
  title: string
  sub?: string
}

type TradingScene =
  | "surge"
  | "plunge"
  | "missed"
  | "floatingGain"
  | "floatingLoss"
  | "beforeStop"
  | "lossStreak"
  | "winStreak"
  | "crowdNoise"
  | "review"

type TradingIntensity = 1 | 2 | 3 | 4 | 5

type InsightThoughtEntry = {
  id: string
  mirrorId: string
  mirrorName: string
  scene: string
  sourceScene: string
  intensity: number
  text: string
  complianceNote?: string
}

type InsightContentEntry = InsightThoughtEntry

type InsightMirrorEntry = {
  mirrorId: string
  mirrorName: string
  thief: string
  thiefExplain: string[]
}

type ZhaoxinRitualFlowProps = {
  onEnterCycle?: () => void
  onLakeModeChange?: (mode: LakeMode) => void
  onRipple?: () => void
  initialScene?: TradingScene
  initialIntensity?: 1 | 2 | 3 | 4 | 5
}

type SceneFloatTag = {
  key: TradingScene
  label: string
  x: number
  y: number
  drift: number
  delay: number
}

type MirrorEcho = {
  key: string
  label: string
  motionType:
    | "chase"
    | "hold"
    | "fantasy"
    | "gamble"
    | "herd"
    | "hesitate"
    | "delay"
    | "anxiety"
    | "liangzhi"
  thought: string
  whisper: string
  payoff: string
  thief: string
  cycle: string
  practice: string
  training: string
  nextReview: string
  proof: string
  lakeMode: LakeMode
  tone: "primary" | "secondary" | "sleep" | "conscience"
  x: number
  y: number
  width: number
  delay: number
  drift: number
}

type MirrorInsight = {
  id: string
  mirrorName: string
  thought: string
  reflection: string[]
  thief: string
  thiefExplain: string[]
  evidence: string
  practice: string
}

type GrowthRecord = {
  scene: TradingScene
  mirrorId: string
  thought: string
  thief: string
  evidence: string
  practice: string
  createdAt: number
}

type RevealStep =
  | "idle"
  | "thought"
  | "pause"
  | "reflectionOne"
  | "reflectionTwo"
  | "reflectionThree"
  | "mirrorName"
  | "thief"
  | "thiefExplain"
  | "evidence"
  | "practiceInsight"

const tradingSceneKeys: TradingScene[] = [
  "surge",
  "plunge",
  "missed",
  "floatingGain",
  "floatingLoss",
  "beforeStop",
  "lossStreak",
  "winStreak",
  "crowdNoise",
  "review",
]

const insightThoughtLibrary = insightThoughts as InsightThoughtEntry[]
const insightReflectionLibrary = insightReflections as InsightContentEntry[]
const insightEvidenceLibrary = insightEvidences as InsightContentEntry[]
const insightPracticeLibrary = insightPractices as InsightContentEntry[]
const insightMirrorLibrary = insightMirrors as InsightMirrorEntry[]

function normalizeTradingScene(scene: string): TradingScene {
  return tradingSceneKeys.includes(scene as TradingScene) ? (scene as TradingScene) : "surge"
}

function normalizeTradingIntensity(intensity: number): TradingIntensity {
  return [1, 2, 3, 4, 5].includes(intensity) ? (intensity as TradingIntensity) : 3
}

function randomThoughtIndex(exceptIndex = -1) {
  if (insightThoughtLibrary.length <= 1) return 0

  const nextIndex = Math.floor(Math.random() * insightThoughtLibrary.length)
  return nextIndex === exceptIndex ? (nextIndex + 1) % insightThoughtLibrary.length : nextIndex
}

function thoughtEntryAt(index: number) {
  return insightThoughtLibrary[index] ?? insightThoughtLibrary[0]
}

function splitInsightText(text: string) {
  const lines: string[] = []
  let current = ""
  const breakMarks = new Set(["，", "。", "！", "？", "；"])

  for (const char of text) {
    current += char

    if (breakMarks.has(char)) {
      lines.push(current.trim())
      current = ""
    }
  }

  if (current.trim()) lines.push(current.trim())
  return (lines.length > 0 ? lines : [text]).slice(0, 3)
}

function pickInsightContent(
  library: InsightContentEntry[],
  mirrorId: string,
  scene: TradingScene,
  intensity: TradingIntensity,
) {
  return (
    library.find((item) => item.mirrorId === mirrorId && item.scene === scene && item.intensity === intensity) ??
    library.find((item) => item.mirrorId === mirrorId && item.scene === scene) ??
    library.find((item) => item.mirrorId === mirrorId && item.intensity === intensity) ??
    library.find((item) => item.mirrorId === mirrorId) ??
    library.find((item) => item.scene === scene) ??
    library[0]
  )
}

function mirrorDetailForKey(mirrorId: string) {
  return (
    insightMirrorLibrary.find((mirror) => mirror.mirrorId === mirrorId) ??
    insightMirrorLibrary[0] ?? {
      mirrorId: "chase",
      mirrorName: "追涨之镜",
      thief: "贪 · 急",
      thiefExplain: ["手比规则快，怕慢一步，怕再次错过。"],
    }
  )
}

const stageText: Record<Stage, StageCopy> = {
  heartMoon: {
    title: "照入九镜",
    sub: "先别解释，先看见那一念。",
  },
  scene: {
    title: "最近一次，\n你没有守住自己的那一笔，\n发生在什么时候？",
  },
  thought: {
    title: "",
  },
  mirrors: {
    title: "",
  },
  thief: {
    title: "心贼浮现",
    sub: "你怕的不是错过行情，是错过之后那个又慢了一步的自己。",
  },
  cycle: {
    title: "循环成纹",
    sub: "看见它，就已经不全在它手里。",
  },
  practice: {
    title: "事上练心",
    sub: "下一次计划外拉升，只练停十秒。",
  },
  liangzhi: {
    title: "致良知",
    sub: "不是压住念头，而是看见它、放下它。",
  },
  seal: {
    title: "落印为证",
    sub: "一印为证，归入今日心证。",
  },
  growth: {
    title: "活镜生长",
    sub: "这一念，已归入你的心镜档案。",
  },
  empty: {
    title: "空镜复明",
    sub: "湖仍是湖，心复其明。",
  },
}

const mirrorInsights: Record<string, MirrorInsight> = {
  chase: {
    id: "chase",
    mirrorName: "追涨之镜",
    thought: "再不上车就来不及了。",
    reflection: ["你怕的不是错过行情。", "你怕的是错过之后，", "那个又慢了一步的自己。"],
    thief: "贪 · 急",
    thiefExplain: ["贪，是想把每一波都抓住。", "急，是规则还没确认，手已经先动了。"],
    evidence: "我看见自己不是在追行情，\n是在追那个“不想再慢一步”的自己。",
    practice: "下一次急涨时，先停三息。\n不追第一口气，只记录这一念。",
  },
  hold: {
    id: "hold",
    mirrorName: "扛单之镜",
    thought: "再等等，它一定会回来。",
    reflection: ["你扛的不是仓位。", "你扛的是不愿承认，", "自己这一次已经看错了。"],
    thief: "痴 · 执",
    thiefExplain: ["痴，是把希望当判断。", "执，是明知道变形了，还舍不得放手。"],
    evidence: "我看见自己不是在等反弹，\n是在等市场替我证明“我没错”。",
    practice: "下一次触发止损时，先执行，再复盘。\n不在盘中和亏损讲道理。",
  },
  fantasy: {
    id: "fantasy",
    mirrorName: "幻想之镜",
    thought: "这次不一样。",
    reflection: ["你等的不是机会。", "你等的是一个，", "可以不用面对错误的理由。"],
    thief: "痴 · 贪",
    thiefExplain: ["痴，是只看自己想看的。", "贪，是还想从已经变形的局里拿回东西。"],
    evidence: "我看见自己不是相信行情，\n是在相信一个能让我舒服的故事。",
    practice: "下一次说“这次不一样”时，写下三个事实。\n只看事实，不看愿望。",
  },
  gamble: {
    id: "gamble",
    mirrorName: "赌性之镜",
    thought: "下一把就能赢回来。",
    reflection: ["你想赢回来的不是亏损。", "你想赢回的是，", "被市场打碎的自尊。"],
    thief: "贪 · 急 · 痴",
    thiefExplain: ["贪，是想一次把失去的都拿回来。", "急，是不愿承受慢慢修正。", "痴，是把交易当成翻盘赌局。"],
    evidence: "我看见自己不是在交易，\n是在和那个“输不起的自己”较劲。",
    practice: "下一次亏损后，暂停一笔。\n先离开盘面，再决定是否继续。",
  },
  herd: {
    id: "herd",
    mirrorName: "从众之镜",
    thought: "大家都在买，是不是我错了？",
    reflection: ["你跟的不是别人。", "你跟的是自己，", "不敢独自负责的那颗心。"],
    thief: "疑 · 怯",
    thiefExplain: ["疑，是不相信自己的判断。", "怯，是害怕一个人承担结果。"],
    evidence: "我看见自己不是相信别人，\n是在逃避为自己的选择负责。",
    practice: "下一次看见群里热闹时，先写自己的判断。\n再看外界声音。",
  },
  hesitate: {
    id: "hesitate",
    mirrorName: "犹疑之镜",
    thought: "再看看，万一呢？",
    reflection: ["你不是缺信号。", "你是在寻找一个，", "不会犯错的保证。"],
    thief: "疑 · 怯",
    thiefExplain: ["疑，是看见了也不敢承认。", "怯，是害怕行动之后没有退路。"],
    evidence: "我看见自己不是谨慎，\n是在用“再等等”保护自己不犯错。",
    practice: "下一次信号出现时，只问一句：\n这是不是我的规则内动作？",
  },
  delay: {
    id: "delay",
    mirrorName: "拖延之镜",
    thought: "复盘明天再说。",
    reflection: ["你拖的不是复盘。", "你拖的是再次看见，", "那个失控过的自己。"],
    thief: "懒 · 痴",
    thiefExplain: ["懒，是知道该做，却把当下推给明天。", "痴，是以为不看见，问题就不存在。"],
    evidence: "我看见自己不是没时间，\n是不想面对今天那个没有守住规则的我。",
    practice: "收盘后三分钟，只写一笔最失控的交易。\n不求完整，只求不逃。",
  },
  anxiety: {
    id: "anxiety",
    mirrorName: "焦虑之镜",
    thought: "会不会又跌回去？",
    reflection: ["你卖掉的不是仓位。", "你卖掉的是，", "自己承受波动的能力。"],
    thief: "惧 · 急",
    thiefExplain: ["惧，是害怕再次失去。", "急，是还没到规则位置，心已经先跑了。"],
    evidence: "我看见自己不是在保护利润，\n是在保护那颗害怕回吐的心。",
    practice: "下一次浮盈波动时，先看规则，不看情绪。\n不到规则位，不用情绪替你平仓。",
  },
  liangzhi: {
    id: "liangzhi",
    mirrorName: "良知之镜",
    thought: "情绪起来了，但我按计划做。",
    reflection: ["你不是没有情绪。", "你只是终于看见，", "规则可以大过那一刻的冲动。"],
    thief: "未现",
    thiefExplain: ["良知不是没有念头。", "是念头起来时，你仍能知道什么该做、什么不该做。"],
    evidence: "我看见自己不是战胜市场，\n而是第一次没有被自己的情绪带走。",
    practice: "记录一次守住规则的证据。\n让自己知道：我可以不跟着情绪走。",
  },
}

const mirrorEchoes: MirrorEcho[] = [
  {
    key: "chase",
    label: "追涨之镜",
    motionType: "chase",
    thought: "再不上车就来不及了。",
    whisper: "怕错过先动",
    payoff: "你怕的不是错过行情。\n你怕的是错过之后，\n那个又慢了一步的自己。",
    thief: "贪 · 急",
    cycle: "怕错过 → 降低标准 → 追进去 → 后悔 → 下次仍想追",
    practice: "下一次急涨时，先停三息。\n不追第一口气，只记录这一念。",
    training: "下一次急涨时，先停三息",
    nextReview: "不追第一口气，只记录这一念",
    proof: "我看见自己不是在追行情，是在追那个“不想再慢一步”的自己。",
    lakeMode: "chase",
    tone: "primary",
    x: 50,
    y: 66,
    width: 23,
    delay: 600,
    drift: 0.04,
  },
  {
    key: "gamble",
    label: "赌性之镜",
    motionType: "gamble",
    thought: "下一把就能赢回来。",
    whisper: "亏后想翻本",
    payoff: "你想赢回来的不是亏损。\n你想赢回的是，\n被市场打碎的自尊。",
    thief: "贪 · 急 · 痴",
    cycle: "亏损 → 不甘 → 想翻回 → 放大风险 → 更难收手",
    practice: "下一次亏损后，暂停一笔。\n先离开盘面，再决定是否继续。",
    training: "亏损后暂停一笔",
    nextReview: "先离开盘面，再决定是否继续",
    proof: "我看见自己不是在交易，是在和那个“输不起的自己”较劲。",
    lakeMode: "gamble",
    tone: "secondary",
    x: 50,
    y: 76,
    width: 17,
    delay: 680,
    drift: -0.08,
  },
  {
    key: "herd",
    label: "从众之镜",
    motionType: "herd",
    thought: "大家都在买，是不是我错了？",
    whisper: "外声入心",
    payoff: "你跟的不是别人。\n你跟的是自己，\n不敢独自负责的那颗心。",
    thief: "疑 · 怯",
    cycle: "不确定 → 问外部 → 标准漂移 → 事后难复盘",
    practice: "下一次看见群里热闹时，先写自己的判断。\n再看外界声音。",
    training: "先写自己的判断",
    nextReview: "再看外界声音",
    proof: "我看见自己不是相信别人，是在逃避为自己的选择负责。",
    lakeMode: "herd",
    tone: "secondary",
    x: 50,
    y: 73,
    width: 17,
    delay: 780,
    drift: 0.1,
  },
  {
    key: "hold",
    label: "扛单之镜",
    motionType: "hold",
    thought: "再等等，它一定会回来。",
    whisper: "把希望当判断",
    payoff: "你扛的不是仓位。\n你扛的是不愿承认，\n自己这一次已经看错了。",
    thief: "痴 · 执",
    cycle: "不愿承认 → 继续等待 → 条件失效 → 事后补理由",
    practice: "下一次触发止损时，先执行，再复盘。\n不在盘中和亏损讲道理。",
    training: "触发止损时，先执行",
    nextReview: "再复盘，不在盘中和亏损讲道理",
    proof: "我看见自己不是在等反弹，是在等市场替我证明“我没错”。",
    lakeMode: "hold",
    tone: "sleep",
    x: 50,
    y: 82,
    width: 13,
    delay: 940,
    drift: -0.05,
  },
  {
    key: "fantasy",
    label: "幻想之镜",
    motionType: "fantasy",
    thought: "这次不一样。",
    whisper: "等它证明我",
    payoff: "你等的不是机会。\n你等的是一个，\n可以不用面对错误的理由。",
    thief: "痴 · 贪",
    cycle: "先有愿望 → 寻找证据 → 忽略事实 → 继续等待",
    practice: "下一次说“这次不一样”时，写下三个事实。\n只看事实，不看愿望。",
    training: "写下三个事实",
    nextReview: "只看事实，不看愿望",
    proof: "我看见自己不是相信行情，是在相信一个能让我舒服的故事。",
    lakeMode: "fantasy",
    tone: "sleep",
    x: 50,
    y: 86,
    width: 13,
    delay: 1020,
    drift: 0.09,
  },
  {
    key: "hesitate",
    label: "犹疑之镜",
    motionType: "hesitate",
    thought: "再看看，万一呢？",
    whisper: "看对不敢行",
    payoff: "你不是缺信号。\n你是在寻找一个，\n不会犯错的保证。",
    thief: "疑 · 怯",
    cycle: "条件出现 → 反复确认 → 错过窗口 → 责怪自己",
    practice: "下一次信号出现时，只问一句：\n这是不是我的规则内动作？",
    training: "信号出现时，只问一句",
    nextReview: "这是不是我的规则内动作？",
    proof: "我看见自己不是谨慎，是在用“再等等”保护自己不犯错。",
    lakeMode: "hesitate",
    tone: "sleep",
    x: 50,
    y: 70,
    width: 13,
    delay: 1100,
    drift: -0.04,
  },
  {
    key: "delay",
    label: "拖延之镜",
    motionType: "delay",
    thought: "复盘明天再说。",
    whisper: "明日再复盘",
    payoff: "你拖的不是复盘。\n你拖的是再次看见，\n那个失控过的自己。",
    thief: "懒 · 痴",
    cycle: "今天拖过 → 明天更重 → 证据丢失 → 继续模糊",
    practice: "收盘后三分钟，只写一笔最失控的交易。\n不求完整，只求不逃。",
    training: "收盘后三分钟",
    nextReview: "只写一笔最失控的交易",
    proof: "我看见自己不是没时间，是不想面对今天那个没有守住规则的我。",
    lakeMode: "delay",
    tone: "sleep",
    x: 50,
    y: 90,
    width: 12,
    delay: 1180,
    drift: 0.03,
  },
  {
    key: "anxiety",
    label: "焦虑之镜",
    motionType: "anxiety",
    thought: "会不会又跌回去？",
    whisper: "得失先扰心",
    payoff: "你卖掉的不是仓位。\n你卖掉的是，\n自己承受波动的能力。",
    thief: "惧 · 急",
    cycle: "怕失去 → 反复盯看 → 情绪升高 → 标准变形",
    practice: "下一次浮盈波动时，先看规则，不看情绪。\n不到规则位，不用情绪替你平仓。",
    training: "先看规则，不看情绪",
    nextReview: "不到规则位，不用情绪替你平仓",
    proof: "我看见自己不是在保护利润，是在保护那颗害怕回吐的心。",
    lakeMode: "anxiety",
    tone: "sleep",
    x: 50,
    y: 80,
    width: 11,
    delay: 1260,
    drift: -0.025,
  },
  {
    key: "liangzhi",
    label: "良知之镜",
    motionType: "liangzhi",
    thought: "情绪起来了，但我按计划做。",
    whisper: "知止守心",
    payoff: "你不是没有情绪。\n你只是终于看见，\n规则可以大过那一刻的冲动。",
    thief: "未现",
    cycle: "念头起 → 先照见 → 规则在前 → 心复其明",
    practice: "记录一次守住规则的证据。\n让自己知道：我可以不跟着情绪走。",
    training: "记录一次守住规则的证据",
    nextReview: "让自己知道：我可以不跟着情绪走",
    proof: "我看见自己不是战胜市场，而是第一次没有被自己的情绪带走。",
    lakeMode: "liangzhi",
    tone: "conscience",
    x: 50,
    y: 93,
    width: 11,
    delay: 1360,
    drift: 0,
  },
]

const mirrorLife: Record<
  string,
  {
    cycle: number
    low: number
    mid: number
    peak: number
    vanish: number
    scale: number
    absorb: number
  }
> = {
  chase: { cycle: 62000, low: 0.16, mid: 0.62, peak: 0.9, vanish: 0.08, scale: 1.08, absorb: 620 },
  hold: { cycle: 84000, low: 0.07, mid: 0.24, peak: 0.34, vanish: 0.04, scale: 0.88, absorb: 1260 },
  fantasy: { cycle: 78000, low: 0.08, mid: 0.28, peak: 0.44, vanish: 0.04, scale: 0.96, absorb: 940 },
  gamble: { cycle: 66000, low: 0.12, mid: 0.48, peak: 0.75, vanish: 0.07, scale: 1.02, absorb: 760 },
  herd: { cycle: 70000, low: 0.1, mid: 0.38, peak: 0.56, vanish: 0.06, scale: 0.98, absorb: 980 },
  hesitate: { cycle: 76000, low: 0.08, mid: 0.26, peak: 0.42, vanish: 0.04, scale: 0.9, absorb: 1120 },
  delay: { cycle: 96000, low: 0.055, mid: 0.18, peak: 0.28, vanish: 0.032, scale: 0.84, absorb: 1360 },
  anxiety: { cycle: 68000, low: 0.09, mid: 0.32, peak: 0.52, vanish: 0.05, scale: 0.78, absorb: 840 },
  liangzhi: { cycle: 104000, low: 0.08, mid: 0.28, peak: 0.38, vanish: 0.06, scale: 0.86, absorb: 920 },
}

const sceneFloatTags = oneThoughtScenes as SceneFloatTag[]

function mirrorForKey(mirrorKey: string) {
  return mirrorEchoes.find((mirror) => mirror.key === mirrorKey) ?? mirrorEchoes[0]
}

function modeForStage(stage: Stage): LakeMode {
  if (stage === "heartMoon") return "still"
  if (stage === "scene") return "still"
  if (stage === "thought") return "thought"
  if (stage === "mirrors") return "chase"
  if (stage === "thief") return "chase"
  if (stage === "cycle") return "chase"
  if (stage === "practice") return "thought"
  if (stage === "liangzhi") return "liangzhi"
  if (stage === "seal") return "liangzhi"
  if (stage === "growth") return "still"
  return "still"
}

const revealStepSchedule: Partial<Record<RevealStep, { next: RevealStep | "liangzhi"; delay: number }>> = {
  thought: { next: "reflectionOne", delay: 3400 },
  reflectionOne: { next: "reflectionTwo", delay: 3800 },
  reflectionTwo: { next: "reflectionThree", delay: 3800 },
  reflectionThree: { next: "thief", delay: 4600 },
  thief: { next: "evidence", delay: 5000 },
  evidence: { next: "practiceInsight", delay: 5400 },
  practiceInsight: { next: "mirrorName", delay: 5600 },
  mirrorName: { next: "liangzhi", delay: 6200 },
}

export default function ZhaoxinRitualFlow({
  onEnterCycle,
  onLakeModeChange,
  onRipple,
  initialScene,
  initialIntensity,
}: ZhaoxinRitualFlowProps) {
  const [stage, setStage] = useState<Stage>(() => (initialScene ? "thought" : "scene"))
  const [selectedScene, setSelectedScene] = useState<TradingScene>(initialScene ?? "surge")
  const [selectedIntensity, setSelectedIntensity] = useState<TradingIntensity>(initialIntensity ?? 3)
  const [thoughtIndex, setThoughtIndex] = useState(() => randomThoughtIndex())
  const [isSceneAbsorbing, setIsSceneAbsorbing] = useState(false)
  const [isMirrorAbsorbing, setIsMirrorAbsorbing] = useState(false)
  const [previewMirrorId, setPreviewMirrorId] = useState("chase")
  const [selectedMirrorId, setSelectedMirrorId] = useState("chase")
  const [mirrorsCanInteract, setMirrorsCanInteract] = useState(false)
  const [revealStep, setRevealStep] = useState<RevealStep>("idle")
  const [isRevealPaused, setIsRevealPaused] = useState(false)
  const [isHoldingLiangzhi, setIsHoldingLiangzhi] = useState(false)
  const [growthRecord, setGrowthRecord] = useState<GrowthRecord | null>(null)
  const absorbTimerRef = useRef<number | null>(null)
  const sceneTimerRefs = useRef<number[]>([])
  const mirrorStageTimerRefs = useRef<number[]>([])
  const revealTimerRefs = useRef<number[]>([])
  const liangzhiHoldTimerRef = useRef<number | null>(null)
  const sceneDrivenMirror = useMemo(
    () => getSceneDrivenMirror({ sceneKey: selectedScene, intensity: selectedIntensity }),
    [selectedIntensity, selectedScene],
  )
  const previewMirror = mirrorForKey(previewMirrorId)
  const selectedMirror = mirrorForKey(selectedMirrorId)
  const selectedMirrorDetail = mirrorDetailForKey(selectedMirrorId)
  const selectedSceneDetail = sceneFloatTags.find((scene) => scene.key === selectedScene) ?? sceneFloatTags[0]
  const currentThoughtEntry = thoughtEntryAt(thoughtIndex)
  const selectedThought = useMemo(
    () => ({
      id: currentThoughtEntry.id,
      mirrorId: currentThoughtEntry.mirrorId,
      mirrorName: currentThoughtEntry.mirrorName,
      sceneKey: normalizeTradingScene(currentThoughtEntry.scene),
      sceneLabel: currentThoughtEntry.sourceScene,
      intensity: normalizeTradingIntensity(currentThoughtEntry.intensity),
      text: currentThoughtEntry.text,
      complianceNote: currentThoughtEntry.complianceNote,
    }),
    [currentThoughtEntry],
  )
  const selectedContent = useMemo(() => {
    const reflection = pickInsightContent(
      insightReflectionLibrary,
      selectedMirrorId,
      selectedScene,
      selectedIntensity,
    )
    const evidence = pickInsightContent(insightEvidenceLibrary, selectedMirrorId, selectedScene, selectedIntensity)
    const practice = pickInsightContent(insightPracticeLibrary, selectedMirrorId, selectedScene, selectedIntensity)

    return {
      mirrorKey: selectedMirrorId,
      sceneKey: selectedScene,
      sceneLabel: selectedSceneDetail.label,
      intensity: selectedIntensity,
      reflection: {
        text: reflection.text,
        lines: splitInsightText(reflection.text),
      },
      evidence: {
        text: evidence.text,
      },
      practice: {
        text: practice.text,
      },
      complianceNote: reflection.complianceNote ?? evidence.complianceNote ?? practice.complianceNote,
    }
  }, [selectedIntensity, selectedMirrorId, selectedScene, selectedSceneDetail.label])
  const selectedInsightBase = mirrorInsights[selectedMirror.key] ?? mirrorInsights.chase
  const selectedInsight = {
    ...selectedInsightBase,
    mirrorName: selectedMirrorDetail.mirrorName ?? selectedInsightBase.mirrorName,
    thought: selectedThought.text,
    reflection: selectedContent.reflection.lines,
    thief: selectedMirrorDetail.thief ?? selectedMirror.thief,
    thiefExplain: selectedMirrorDetail.thiefExplain ?? selectedInsightBase.thiefExplain,
    evidence: selectedContent.evidence.text,
    practice: selectedContent.practice.text,
  }

  useEffect(() => {
    onLakeModeChange?.(initialScene ? "thought" : "still")
  }, [initialScene, onLakeModeChange])

  useEffect(() => {
    let timer: number | null = null

    if (stage === "seal") {
      timer = window.setTimeout(() => {
        setGrowthRecord(
          createLivingMirrorGrowthRecord({
            sceneKey: selectedScene,
            mirrorKey: selectedMirrorId,
            thought: selectedThought,
            thief: selectedInsight.thief,
            evidence: selectedContent.evidence,
            practice: selectedContent.practice,
          }) as GrowthRecord,
        )
        setStage("growth")
        setRevealStep("idle")
        onLakeModeChange?.(modeForStage("growth"))
      }, 2600)
    }

    if (stage === "growth") {
      timer = window.setTimeout(() => {
        setStage("empty")
        setRevealStep("idle")
        onLakeModeChange?.(modeForStage("empty"))
      }, 5200)
    }

    if (stage === "empty") {
      timer = window.setTimeout(() => {
        onEnterCycle?.()
      }, 5200)
    }

    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [
    onEnterCycle,
    onLakeModeChange,
    selectedContent.evidence,
    selectedContent.practice,
    selectedInsight.thief,
    selectedMirrorId,
    selectedScene,
    selectedThought,
    stage,
  ])

  const clearRevealTimers = useCallback(() => {
    for (const timer of revealTimerRefs.current) {
      window.clearTimeout(timer)
    }
    revealTimerRefs.current = []
  }, [])

  const absorbMirror = useCallback(
    (mirror: MirrorEcho) => {
      if (stage !== "mirrors" || isMirrorAbsorbing) return

      setSelectedMirrorId(mirror.key)
      setPreviewMirrorId(mirror.key)
      setIsMirrorAbsorbing(true)
      setMirrorsCanInteract(false)
      setRevealStep("idle")
      setGrowthRecord(null)
      onLakeModeChange?.(mirror.lakeMode)

      if (absorbTimerRef.current) {
        window.clearTimeout(absorbTimerRef.current)
      }
      clearRevealTimers()

      const absorbDuration = mirrorLife[mirror.key]?.absorb ?? 820
      const focusDuration = Math.max(1180, Math.min(1480, absorbDuration + 420))

      absorbTimerRef.current = window.setTimeout(() => {
        setStage("thief")
        setIsMirrorAbsorbing(false)
        setRevealStep("thought")
      }, focusDuration)
    },
    [clearRevealTimers, isMirrorAbsorbing, onLakeModeChange, stage],
  )

  useEffect(() => {
    for (const timer of mirrorStageTimerRefs.current) {
      window.clearTimeout(timer)
    }
    mirrorStageTimerRefs.current = []

    if (stage !== "mirrors") {
      return
    }

    const mirrorToAbsorb = mirrorForKey(previewMirrorId)

    mirrorStageTimerRefs.current = [
      window.setTimeout(() => setMirrorsCanInteract(true), 420),
      window.setTimeout(() => {
        absorbMirror(mirrorToAbsorb)
      }, 980),
    ]

    return () => {
      for (const timer of mirrorStageTimerRefs.current) {
        window.clearTimeout(timer)
      }
      mirrorStageTimerRefs.current = []
    }
  }, [absorbMirror, previewMirrorId, stage])

  useEffect(() => {
    if (stage !== "thought" || isMirrorAbsorbing) return undefined
    if (isRevealPaused) return undefined

    const timer = window.setInterval(() => {
      setThoughtIndex((current) => randomThoughtIndex(current))
    }, 3600)

    return () => window.clearInterval(timer)
  }, [isMirrorAbsorbing, isRevealPaused, stage])

  useEffect(() => {
    if (stage !== "thief" || isMirrorAbsorbing || isRevealPaused) return undefined

    const schedule = revealStepSchedule[revealStep]
    if (!schedule) return undefined

    const timer = window.setTimeout(() => {
      if (schedule.next === "liangzhi") {
        setStage("liangzhi")
        setRevealStep("idle")
        onLakeModeChange?.("liangzhi")
        return
      }

      setRevealStep(schedule.next)
    }, schedule.delay)

    revealTimerRefs.current = [timer]

    return () => {
      window.clearTimeout(timer)
      revealTimerRefs.current = revealTimerRefs.current.filter((item) => item !== timer)
    }
  }, [isMirrorAbsorbing, isRevealPaused, onLakeModeChange, revealStep, stage])

  useEffect(() => {
    if (stage === "mirrors" && !isMirrorAbsorbing) {
      onLakeModeChange?.(previewMirror.lakeMode)
    }
  }, [isMirrorAbsorbing, onLakeModeChange, previewMirror.lakeMode, stage])

  useEffect(() => {
    return () => {
      if (absorbTimerRef.current) {
        window.clearTimeout(absorbTimerRef.current)
      }
      if (liangzhiHoldTimerRef.current) {
        window.clearTimeout(liangzhiHoldTimerRef.current)
      }
      for (const timer of sceneTimerRefs.current) {
        window.clearTimeout(timer)
      }
      for (const timer of mirrorStageTimerRefs.current) {
        window.clearTimeout(timer)
      }
      for (const timer of revealTimerRefs.current) {
        window.clearTimeout(timer)
      }
    }
  }, [])

  const sceneFloatStyle = (scene: SceneFloatTag) =>
    ({
      "--scene-x": `${scene.x}%`,
      "--scene-y": `${scene.y}%`,
      "--scene-delay": `${scene.delay}ms`,
      "--scene-duration": `${8200 + scene.delay * 0.8}ms`,
      "--scene-drift": `${scene.drift * 28}px`,
      "--scene-skew": `${scene.drift * 8}deg`,
    }) as CSSProperties

  const mirrorEchoStyle = (mirror: MirrorEcho) => {
    const life = mirrorLife[mirror.key] ?? mirrorLife.chase
    const driftX = mirror.drift * 84

    return {
      "--mx": `${mirror.x}%`,
      "--my": `${mirror.y}%`,
      "--mw": `${mirror.width}vw`,
      "--delay": `${mirror.delay}ms`,
      "--axis-cycle": `${life.cycle}ms`,
      "--axis-delay": `${mirror.delay * 0.64}ms`,
      "--axis-near-x": `${driftX}vw`,
      "--axis-mid-x": `${driftX * 0.48}vw`,
      "--axis-dx": `${driftX * 0.3}vw`,
      "--life-low": life.low,
      "--life-mid": life.mid,
      "--life-peak": life.peak,
      "--life-vanish": life.vanish,
      "--absorb-duration": `${life.absorb}ms`,
      "--drift-skew-base": `${mirror.drift * 7}deg`,
      "--shear-delay": `${mirror.delay * 0.5}ms`,
      "--inner-delay": `${mirror.delay * 0.8}ms`,
    } as CSSProperties
  }

  const selectScene = (scene: SceneFloatTag) => {
    if (stage !== "scene" || isSceneAbsorbing) return

    const drivenMirror = getSceneDrivenMirror({ sceneKey: scene.key, intensity: selectedIntensity })

    setSelectedScene(scene.key)
    setPreviewMirrorId(drivenMirror.mirrorKey)
    setSelectedMirrorId(drivenMirror.mirrorKey)
    setIsSceneAbsorbing(true)
    setMirrorsCanInteract(false)
    setGrowthRecord(null)

    for (const timer of sceneTimerRefs.current) {
      window.clearTimeout(timer)
    }

    sceneTimerRefs.current = [
      window.setTimeout(() => {
        onLakeModeChange?.("thought")
        onRipple?.()
      }, 900),
      window.setTimeout(() => {
        setStage("thought")
        setIsSceneAbsorbing(false)
      }, 1500),
    ]
  }

  const confirmThought = () => {
    if (stage !== "thought" || isMirrorAbsorbing) return

    const thoughtScene = selectedThought.sceneKey
    const thoughtIntensity = selectedThought.intensity
    const mirror = mirrorForKey(selectedThought.mirrorId)

    setSelectedScene(thoughtScene)
    setSelectedIntensity(thoughtIntensity)
    setSelectedMirrorId(mirror.key)
    setPreviewMirrorId(mirror.key)
    setMirrorsCanInteract(false)
    setRevealStep("idle")
    setGrowthRecord(null)
    onRipple?.()
    onLakeModeChange?.(mirror.lakeMode)
    setStage("mirrors")
  }

  const clearLiangzhiHold = () => {
    if (liangzhiHoldTimerRef.current) {
      window.clearTimeout(liangzhiHoldTimerRef.current)
      liangzhiHoldTimerRef.current = null
    }
    setIsHoldingLiangzhi(false)
  }

  const completeLiangzhiHold = () => {
    liangzhiHoldTimerRef.current = null
    setIsHoldingLiangzhi(false)
    setStage("seal")
    onLakeModeChange?.("liangzhi")
  }

  const startLiangzhiHold = () => {
    if (stage !== "liangzhi") return
    setIsHoldingLiangzhi(true)
    onLakeModeChange?.("liangzhi")

    if (liangzhiHoldTimerRef.current) {
      window.clearTimeout(liangzhiHoldTimerRef.current)
    }

    liangzhiHoldTimerRef.current = window.setTimeout(completeLiangzhiHold, 960)
  }

  const displayTitle =
    stage === "thought"
      ? `「${selectedThought.text}」`
    : stage === "mirrors"
      ? `「${selectedInsight.thought}」`
    : stage === "thief" && revealStep === "thought"
        ? `「${selectedInsight.thought}」`
        : stage === "thief" && revealStep === "pause"
          ? ""
          : stage === "thief" && revealStep === "reflectionOne"
            ? selectedInsight.reflection[0]
            : stage === "thief" && revealStep === "reflectionTwo"
              ? selectedInsight.reflection[1]
                : stage === "thief" && revealStep === "reflectionThree"
                  ? selectedInsight.reflection[2]
                : stage === "thief" && revealStep === "mirrorName"
                  ? `你照见了：\n${selectedInsight.mirrorName}`
                  : stage === "thief" && revealStep === "evidence"
                      ? "心证"
                      : stage === "thief" && revealStep === "practiceInsight"
                        ? selectedInsight.practice
                        : stage === "thief"
                          ? selectedInsight.thief
                          : stageText[stage].title
  const displaySub =
    stage === "scene"
      ? ""
      : stage === "thought"
        ? ""
    : stage === "mirrors"
      ? ""
      : stage === "thief" && revealStep === "thought"
        ? ""
      : stage === "thief" && revealStep === "pause"
          ? ""
          : stage === "thief" && revealStep === "reflectionOne"
            ? ""
            : stage === "thief" && revealStep === "reflectionTwo"
              ? ""
              : stage === "thief" && revealStep === "reflectionThree"
                ? ""
                : stage === "thief" && revealStep === "mirrorName"
                  ? ""
                : stage === "thief" && revealStep === "evidence"
                    ? selectedInsight.evidence
                  : stage === "thief" && revealStep === "practiceInsight"
                    ? ""
          : stage === "thief"
            ? "心贼自水底显影；照见它，才不再被它牵走。"
            : stage === "cycle"
              ? selectedMirror.cycle
              : stage === "practice"
                ? selectedInsight.practice
                : stage === "seal"
                  ? `今日心证：${selectedInsight.evidence}`
                  : stage === "growth"
                    ? "这一念，已归入你的心镜档案。"
                    : stageText[stage].sub

  return (
    <section
      className={`zhaoxin-ritual-flow ${isHoldingLiangzhi ? "is-holding-liangzhi" : ""} ${
        isMirrorAbsorbing ? "is-focusing" : ""
      } ${initialScene ? "is-direct-thought" : ""}`}
      aria-label="照心九镜仪式"
    >
      <div className="zhaoxin-vignette" aria-hidden="true" />
      {stage === "liangzhi" ? <div className="liangzhi-hold-glow" aria-hidden="true" /> : null}

      <div
        className={`zhaoxin-copy is-${stage} is-reveal-${revealStep}`}
        onPointerEnter={() => setIsRevealPaused(true)}
        onPointerLeave={() => setIsRevealPaused(false)}
      >
        <div
          key={`${stage}-${stage === "scene" ? selectedSceneDetail.key : stage === "mirrors" ? previewMirrorId : revealStep}`}
          className="zhaoxin-copy-inner"
        >
          {stage === "thief" && revealStep === "thief" ? (
            <h1 className="thief-title">
              <span className="thief-prefix">心贼</span>
              <span className="thief-mark">{selectedInsight.thief}</span>
            </h1>
          ) : displayTitle ? (
            <h1>{displayTitle}</h1>
          ) : (
            <span aria-hidden="true" />
          )}
          {displaySub ? <p>{displaySub}</p> : null}
        </div>
      </div>

      {stage === "scene" ? (
        <div
          className={`scene-float-field ${isSceneAbsorbing ? "is-absorbing" : ""}`}
          aria-label="起念场景浮签"
        >
          <div className="scene-lake-center" aria-hidden="true" />
          <div className="scene-lake-ripple" aria-hidden="true" />
          {sceneFloatTags.map((scene) => {
            const isSelected = scene.key === selectedScene
            const isMuted = isSceneAbsorbing && !isSelected

            return (
              <button
                type="button"
                key={scene.key}
                className={`scene-float-tag ${isSelected ? "is-selected" : ""} ${isMuted ? "is-muted" : ""}`}
                style={sceneFloatStyle(scene)}
                disabled={isSceneAbsorbing}
                onClick={() => selectScene(scene)}
                aria-pressed={isSelected && isSceneAbsorbing}
              >
                <span>{scene.label}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      {stage === "mirrors" ? (
        <div
          className={`mirror-echo-field ${isMirrorAbsorbing ? "is-absorbing" : ""} ${
            mirrorsCanInteract ? "is-hint-visible" : ""
          }`}
          aria-label="九镜隐现"
        >
          {mirrorEchoes.map((mirror) => {
            const isSelected = mirror.key === previewMirrorId

            return (
              <div
                key={mirror.key}
                className={`mirror-echo is-${mirror.motionType} is-${mirror.tone} ${isSelected ? "is-selected is-preview" : ""} ${
                  isSelected && mirrorsCanInteract ? "is-armed" : ""
                }`}
                style={mirrorEchoStyle(mirror)}
                aria-current={isSelected ? "true" : undefined}
              >
                <i aria-hidden="true" />
                <b>{mirror.label}</b>
                <em>{selectedThought.text}</em>
              </div>
            )
          })}
          <p className="mirror-touch-hint">
            {mirrorsCanInteract ? "那一句一念，正在照亮最贴近的一面心镜。" : "九镜从湖面远处浮现。"}
          </p>
        </div>
      ) : null}

      {stage === "growth" ? (
        <div className="growth-proof" aria-label="活镜成长证据">
          <span>本次照见：{selectedInsight.mirrorName} +1</span>
          <span>起念场景：{selectedSceneDetail.label}</span>
          <span>今日心贼：{growthRecord?.thief ?? selectedInsight.thief}</span>
          <span>今日修行：{growthRecord?.practice ?? selectedInsight.practice}</span>
        </div>
      ) : null}

      {stage === "thought" ? (
        <>
          <button
            type="button"
            className="ritual-next is-thought-confirm"
            onClick={confirmThought}
            onPointerEnter={() => setIsRevealPaused(true)}
            onPointerLeave={() => setIsRevealPaused(false)}
          >
            照见此念
          </button>
          <p className="ritual-thought-hint">若这一念正是你，请轻触照见。</p>
        </>
      ) : null}

      {stage === "liangzhi" ? (
        <button
          type="button"
          className={`ritual-next is-liangzhi-hold ${isHoldingLiangzhi ? "is-holding" : ""}`}
          onPointerDown={startLiangzhiHold}
          onPointerUp={clearLiangzhiHold}
          onPointerLeave={clearLiangzhiHold}
          onPointerCancel={clearLiangzhiHold}
        >
          按住水面 · 致良知
        </button>
      ) : null}

      <style jsx>{`
        .zhaoxin-ritual-flow {
          position: relative;
          z-index: 6;
          width: 100%;
          max-width: 100vw;
          min-height: calc(100svh - 2.5rem);
          overflow: hidden;
          background: transparent;
          color: #e8e4d2;
          pointer-events: none;
          -webkit-tap-highlight-color: transparent;
        }

        .zhaoxin-ritual-flow.is-direct-thought {
          animation: thoughtLakeArrive 2600ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .zhaoxin-vignette {
          position: absolute;
          inset: 0;
          z-index: 10;
          pointer-events: none;
          background:
            radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.16) 46%, rgba(0, 0, 0, 0.74) 100%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.08), transparent 42%, rgba(0, 0, 0, 0.44));
        }

        .liangzhi-hold-glow {
          position: absolute;
          left: 50%;
          top: 58%;
          z-index: 18;
          width: min(44vw, 22rem);
          height: min(18vw, 8.5rem);
          transform: translate(-50%, -50%) scale(0.82);
          border-radius: 999px;
          background:
            radial-gradient(ellipse at center, rgba(236, 226, 176, 0.28), rgba(192, 206, 188, 0.08) 36%, transparent 72%),
            radial-gradient(ellipse at 50% 60%, rgba(132, 190, 196, 0.12), transparent 66%);
          filter: blur(18px);
          opacity: 0;
          pointer-events: none;
          transition:
            opacity 520ms ease,
            transform 960ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .zhaoxin-ritual-flow.is-holding-liangzhi .liangzhi-hold-glow {
          opacity: 0.92;
          transform: translate(-50%, -50%) scale(1.04);
        }

        .zhaoxin-copy {
          position: absolute;
          top: 30%;
          left: 50%;
          z-index: 20;
          width: min(34rem, calc(100vw - 2rem));
          transform: translateX(-50%);
          text-align: center;
          pointer-events: auto;
        }

        .zhaoxin-copy-inner {
          animation: zhaoxinFadeIn 1400ms ease forwards;
        }

        .zhaoxin-copy h1 {
          max-width: 100%;
          margin: 0;
          font-family: var(--font-serif, "Songti SC", serif);
          font-size: clamp(1.82rem, 4.8vw, 3.45rem);
          font-weight: 400;
          line-height: 1.45;
          letter-spacing: 0.12em;
          color: rgba(232, 228, 210, 0.84);
          text-shadow: 0 0 24px rgba(226, 222, 203, 0.12);
          overflow-wrap: anywhere;
          text-wrap: balance;
        }

        .zhaoxin-copy p {
          max-width: 32rem;
          margin: 1.1rem auto 0;
          font-family: var(--font-serif, "Songti SC", serif);
          font-size: clamp(0.86rem, 1.7vw, 1.02rem);
          font-weight: 400;
          line-height: 2;
          letter-spacing: 0.1em;
          color: rgba(232, 228, 210, 0.44);
          white-space: pre-line;
        }

        .zhaoxin-copy.is-reveal-practiceInsight {
          top: 27.5%;
          width: min(43rem, calc(100vw - 2rem));
        }

        .zhaoxin-copy.is-reveal-practiceInsight .zhaoxin-copy-inner::before {
          content: "今日修行";
          display: block;
          margin-bottom: 1rem;
          color: rgba(216, 183, 111, 0.62);
          font-family: var(--font-serif, "Songti SC", serif);
          font-size: clamp(0.78rem, 1.35vw, 0.95rem);
          font-weight: 400;
          letter-spacing: 0.32em;
          text-shadow: 0 0 18px rgba(216, 183, 111, 0.12);
        }

        .zhaoxin-copy.is-reveal-reflectionOne .zhaoxin-copy-inner::before,
        .zhaoxin-copy.is-reveal-reflectionTwo .zhaoxin-copy-inner::before,
        .zhaoxin-copy.is-reveal-reflectionThree .zhaoxin-copy-inner::before {
          content: "";
          display: none;
          margin-bottom: 0;
          color: rgba(216, 183, 111, 0.58);
          font-family: var(--font-serif, "Songti SC", serif);
          font-size: clamp(0.72rem, 1.25vw, 0.88rem);
          font-weight: 400;
          letter-spacing: 0.3em;
          text-shadow: 0 0 18px rgba(216, 183, 111, 0.1);
        }

        .zhaoxin-copy.is-reveal-practiceInsight h1 {
          max-width: min(42rem, calc(100vw - 2rem));
          margin: 0 auto;
          color: rgba(244, 235, 221, 0.88);
          font-size: clamp(1.48rem, 3.2vw, 2.5rem);
          line-height: 1.78;
          letter-spacing: 0.1em;
          text-shadow:
            0 0 28px rgba(216, 183, 111, 0.12),
            0 18px 48px rgba(0, 0, 0, 0.72);
          white-space: pre-line;
        }

        .zhaoxin-copy.is-thief {
          top: 31%;
        }

        .zhaoxin-copy.is-thief h1 {
          color: rgba(232, 228, 210, 0.78);
        }

        .zhaoxin-copy.is-scene {
          top: clamp(3.2rem, 8.2svh, 5.8rem);
          width: min(42rem, calc(100vw - 2rem));
        }

        .zhaoxin-copy.is-scene h1 {
          color: rgba(244, 235, 221, 0.78);
          font-size: clamp(1.34rem, 3.2vw, 2.45rem);
          line-height: 1.7;
          letter-spacing: 0.12em;
          text-shadow:
            0 0 28px rgba(216, 183, 111, 0.08),
            0 18px 48px rgba(0, 0, 0, 0.74);
        }

        .zhaoxin-copy.is-thought {
          top: 33.5%;
          width: min(42rem, calc(100vw - 2rem));
        }

        .zhaoxin-copy.is-thought .zhaoxin-copy-inner {
          animation: sceneThoughtRise 1800ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .zhaoxin-ritual-flow.is-direct-thought .zhaoxin-copy.is-thought .zhaoxin-copy-inner {
          animation-delay: 720ms;
        }

        .zhaoxin-copy.is-thought h1 {
          color: rgba(244, 235, 221, 0.88);
          font-size: clamp(1.8rem, 4.2vw, 3.35rem);
          letter-spacing: 0.11em;
          text-shadow:
            0 0 28px rgba(216, 183, 111, 0.16),
            0 20px 64px rgba(0, 0, 0, 0.82);
        }

        .scene-float-field {
          position: absolute;
          inset: 0;
          z-index: 19;
          font-family: var(--font-serif, "Songti SC", serif);
          pointer-events: none;
        }

        .scene-float-field::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 58%;
          width: min(86vw, 54rem);
          height: min(35svh, 20rem);
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background:
            radial-gradient(ellipse at center, rgba(216, 183, 111, 0.08), rgba(95, 132, 117, 0.045) 34%, transparent 70%),
            radial-gradient(ellipse at 50% 62%, rgba(244, 235, 221, 0.035), transparent 64%);
          filter: blur(14px);
          opacity: 0.74;
          pointer-events: none;
        }

        .scene-lake-center {
          position: absolute;
          left: 50%;
          top: 58%;
          width: clamp(4.8rem, 11vw, 8.8rem);
          height: clamp(1.3rem, 3vw, 2.4rem);
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background:
            radial-gradient(ellipse at center, rgba(244, 235, 221, 0.22), rgba(216, 183, 111, 0.08) 34%, transparent 74%),
            radial-gradient(ellipse at 50% 62%, rgba(95, 132, 117, 0.16), transparent 72%);
          filter: blur(8px);
          opacity: 0.58;
          animation: sceneCenterBreath 6.8s ease-in-out infinite;
          pointer-events: none;
        }

        .scene-lake-ripple {
          position: absolute;
          left: 50%;
          top: 58%;
          width: clamp(4.2rem, 10vw, 8rem);
          height: clamp(1.4rem, 3.2vw, 2.7rem);
          transform: translate(-50%, -50%) scale(0.42);
          border: 1px solid rgba(236, 226, 176, 0.34);
          border-radius: 999px;
          opacity: 0;
          filter: blur(0.5px);
          pointer-events: none;
        }

        .scene-float-field.is-absorbing .scene-lake-ripple {
          animation: sceneLakeRipple 1300ms ease-out 900ms both;
        }

        .scene-float-tag {
          position: absolute;
          left: var(--scene-x);
          top: var(--scene-y);
          z-index: 2;
          display: inline-flex;
          min-width: 0;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(217, 189, 122, 0.11);
          border-radius: 999px;
          background: transparent;
          padding: 0.42rem 0.84rem;
          color: rgba(244, 235, 221, 0.72);
          font: inherit;
          font-size: clamp(0.76rem, 1.5vw, 0.94rem);
          font-weight: 400;
          line-height: 1.4;
          letter-spacing: 0.14em;
          opacity: 0.35;
          filter: blur(0.25px);
          text-shadow:
            0 0 18px rgba(216, 183, 111, 0.12),
            0 10px 30px rgba(0, 0, 0, 0.86);
          cursor: pointer;
          pointer-events: auto;
          appearance: none;
          touch-action: manipulation;
          transition:
            opacity 520ms ease,
            border-color 520ms ease,
            color 520ms ease,
            filter 520ms ease,
            transform 620ms cubic-bezier(0.16, 1, 0.3, 1);
          animation: sceneTagFloat var(--scene-duration) ease-in-out var(--scene-delay) infinite;
        }

        .scene-float-tag span {
          position: relative;
          white-space: nowrap;
        }

        .scene-float-tag::before {
          content: "";
          position: absolute;
          inset: 42% 10% 40%;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(216, 183, 111, 0.34), rgba(244, 235, 221, 0.18), transparent);
          filter: blur(6px);
          opacity: 0.28;
          transform: scaleX(0.78);
          pointer-events: none;
        }

        .scene-float-tag:not(:disabled):hover,
        .scene-float-tag:not(:disabled):focus-visible {
          border-color: rgba(217, 189, 122, 0.32);
          color: rgba(244, 235, 221, 0.92);
          opacity: 0.85;
          filter: blur(0);
          transform: translate(-50%, -50%) translateY(-2px);
          outline: none;
        }

        .scene-float-tag:not(:disabled):active {
          opacity: 0.94;
          transform: translate(-50%, -50%) translateY(1px) scale(0.992);
        }

        .scene-float-tag.is-selected {
          border-color: rgba(236, 226, 176, 0.5);
          color: rgba(244, 235, 221, 0.96);
          opacity: 0.9;
          filter: blur(0);
        }

        .scene-float-tag.is-muted {
          opacity: 0.08;
          filter: blur(3px);
          pointer-events: none;
          transition-delay: 200ms;
        }

        .scene-float-field.is-absorbing .scene-float-tag.is-selected {
          animation: sceneTagEnterCenter 1200ms cubic-bezier(0.16, 1, 0.3, 1) 500ms forwards;
          pointer-events: none;
        }

        .thief-title {
          position: relative;
          display: inline-flex;
          align-items: baseline;
          justify-content: center;
          gap: 0.18em;
          flex-wrap: wrap;
        }

        .thief-title::after {
          content: "";
          position: absolute;
          left: 50%;
          top: calc(100% + 0.58rem);
          width: min(48vw, 18rem);
          height: 1.35rem;
          transform: translateX(-50%);
          border-radius: 999px;
          background: radial-gradient(ellipse at center, rgba(138, 50, 38, 0.16), rgba(138, 50, 38, 0.04) 40%, transparent 72%);
          filter: blur(4px);
          opacity: 0;
          animation: thiefRipple 2100ms ease-out 520ms both;
          pointer-events: none;
        }

        .thief-prefix {
          display: inline-block;
          color: rgba(176, 142, 102, 0.5);
          font-size: 0.46em;
          letter-spacing: 0.22em;
          transform: translateY(-0.18em);
        }

        .thief-mark {
          display: inline-block;
          color: rgba(174, 65, 47, 0.78);
          text-shadow:
            0 0 28px rgba(126, 42, 31, 0.34),
            0 18px 46px rgba(0, 0, 0, 0.72);
          animation:
            thiefInkRise 1500ms cubic-bezier(0.16, 1, 0.3, 1) both,
            thiefWaterWaver 5200ms ease-in-out 1500ms infinite;
        }

        .mirror-echo-field {
          position: absolute;
          inset: 0;
          z-index: 20;
          font-family: var(--font-serif, "Songti SC", serif);
          pointer-events: none;
        }

        .mirror-echo-field::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 49%;
          width: clamp(4.8rem, 12vw, 9rem);
          height: clamp(0.65rem, 1.45vw, 1.1rem);
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: radial-gradient(ellipse at center, rgba(229, 208, 143, 0.2), rgba(181, 203, 195, 0.05) 48%, transparent 74%);
          filter: blur(8px);
          opacity: 0.46;
          pointer-events: none;
        }

        .mirror-echo {
          --echo-strength: 0.16;
          --echo-label: 0.06;
          --echo-blur: 1.8px;
          position: absolute;
          left: var(--mx);
          top: var(--my);
          display: block;
          width: clamp(5.2rem, var(--mw), 18rem);
          height: clamp(2.4rem, 4.2vw, 4.8rem);
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          opacity: 0;
          filter: blur(var(--echo-blur));
          transform: translate(-50%, -50%) translateY(14px) scaleX(0.82);
          cursor: pointer;
          pointer-events: auto;
          appearance: none;
          will-change: left, top, opacity, filter;
          animation:
            mirrorEchoWake 2200ms cubic-bezier(0.16, 1, 0.3, 1) var(--delay) forwards,
            mirrorAxisLife var(--axis-cycle) ease-in-out var(--axis-delay) infinite;
          touch-action: none;
        }

        .mirror-echo:disabled {
          cursor: default;
        }

        .mirror-echo::before,
        .mirror-echo::after,
        .mirror-echo i {
          content: "";
          position: absolute;
          pointer-events: none;
        }

        .mirror-echo::before {
          inset: 41% 5% 43%;
          border-radius: 999px;
          background:
            radial-gradient(ellipse at 50% 55%, rgba(244, 235, 206, calc(var(--echo-strength) * 0.58)), rgba(226, 208, 151, calc(var(--echo-strength) * 0.18)) 28%, transparent 74%),
            linear-gradient(90deg, transparent 0%, rgba(174, 190, 183, calc(var(--echo-strength) * 0.12)) 14%, rgba(218, 198, 134, calc(var(--echo-strength) * 0.46)) 42%, rgba(242, 232, 194, calc(var(--echo-strength) * 0.5)) 52%, rgba(196, 174, 112, calc(var(--echo-strength) * 0.24)) 68%, transparent 100%);
          filter: blur(5px);
          opacity: 0.72;
          transform: scaleX(0.9) scaleY(0.62);
          mix-blend-mode: screen;
        }

        .mirror-echo::after {
          inset: 33% 9% 34%;
          background:
            linear-gradient(90deg, transparent 0%, rgba(226, 208, 151, calc(var(--echo-strength) * 0.12)) 22%, transparent 42%),
            linear-gradient(90deg, transparent 5%, rgba(226, 208, 151, calc(var(--echo-strength) * 0.22)) 27%, rgba(244, 235, 206, calc(var(--echo-strength) * 0.34)) 49%, rgba(226, 208, 151, calc(var(--echo-strength) * 0.12)) 68%, transparent 94%),
            linear-gradient(90deg, transparent 0%, rgba(180, 206, 210, calc(var(--echo-strength) * 0.1)) 46%, transparent 100%),
            linear-gradient(90deg, transparent 12%, rgba(244, 235, 206, calc(var(--echo-strength) * 0.18)) 40%, transparent 68%);
          background-size:
            31% 1px,
            88% 1px,
            54% 1px,
            24% 1px;
          background-position:
            9% 30%,
            50% 50%,
            70% 66%,
            38% 78%;
          background-repeat: no-repeat;
          filter: blur(0.35px);
          opacity: 0.78;
          mix-blend-mode: screen;
          animation: mirrorLightShear 6.8s ease-in-out var(--shear-delay) infinite;
        }

        .mirror-echo i {
          inset: 27% -6% 30%;
          opacity: 0.7;
          background:
            radial-gradient(ellipse at 51% 48%, rgba(235, 224, 184, calc(var(--echo-strength) * 0.18)), transparent 22%),
            radial-gradient(ellipse at 42% 58%, rgba(200, 178, 116, calc(var(--echo-strength) * 0.12)), transparent 18%),
            linear-gradient(90deg, transparent 4%, rgba(218, 202, 150, calc(var(--echo-strength) * 0.18)) 34%, transparent 58%),
            linear-gradient(90deg, transparent 24%, rgba(198, 218, 218, calc(var(--echo-strength) * 0.08)) 46%, transparent 74%);
          background-size:
            52% 45%,
            38% 35%,
            72% 1px,
            86% 1px;
          background-position:
            50% 52%,
            38% 64%,
            52% 36%,
            44% 72%;
          background-repeat: no-repeat;
          filter: blur(1.8px);
          transform: skewX(var(--drift-skew-base));
          animation: mirrorInnerDrift 8.4s ease-in-out var(--inner-delay) infinite;
        }

        .mirror-echo b,
        .mirror-echo em {
          position: absolute;
          left: 50%;
          display: block;
          width: max-content;
          max-width: min(14rem, 48vw);
          transform: translateX(-50%);
          font-family: var(--font-serif, "Songti SC", serif);
          font-style: normal;
          font-weight: 400;
          text-align: center;
          white-space: nowrap;
          opacity: var(--echo-label);
          text-shadow:
            0 0 18px rgba(216, 183, 111, calc(var(--echo-strength) * 0.34)),
            0 8px 22px rgba(0, 0, 0, 0.76);
        }

        .mirror-echo b {
          top: -0.9rem;
          color: rgba(232, 228, 210, 0.74);
          font-size: clamp(0.68rem, 1.35vw, 0.9rem);
          letter-spacing: 0.2em;
          opacity: 0;
        }

        .mirror-echo em {
          top: calc(100% + 0.16rem);
          color: rgba(196, 206, 200, 0.52);
          font-size: clamp(0.58rem, 1.12vw, 0.72rem);
          letter-spacing: 0.16em;
        }

        .mirror-echo.is-primary {
          --echo-strength: 0.46;
          --echo-label: 0.055;
          --echo-blur: 1px;
        }

        .mirror-echo.is-secondary {
          --echo-strength: 0.28;
          --echo-label: 0.035;
          --echo-blur: 1.5px;
        }

        .mirror-echo.is-sleep {
          --echo-strength: 0.12;
          --echo-label: 0.015;
          --echo-blur: 2.4px;
        }

        .mirror-echo.is-conscience {
          --echo-strength: 0.18;
          --echo-label: 0.028;
          --echo-blur: 1.7px;
        }

        .mirror-echo.is-selected {
          --echo-strength: 0.94;
          --echo-label: 0.82;
          --echo-blur: 0.45px;
          z-index: 4;
        }

        .mirror-echo.is-conscience::before {
          background:
            radial-gradient(ellipse at 50% 55%, rgba(224, 228, 196, 0.18), rgba(184, 206, 196, 0.04) 34%, transparent 72%),
            linear-gradient(90deg, transparent, rgba(220, 226, 190, 0.1) 50%, transparent);
        }

        .mirror-echo.is-sleep em {
          display: none;
        }

        .mirror-echo.is-preview {
          --echo-strength: 1.12;
          --echo-label: 0.96;
          --echo-blur: 0.18px;
          z-index: 6;
          animation-play-state: paused, paused;
        }

        .mirror-echo b,
        .mirror-echo.is-preview b,
        .mirror-echo-field.is-absorbing .mirror-echo.is-selected b {
          opacity: 0;
        }

        .mirror-echo.is-preview em {
          opacity: 0.86;
        }

        .mirror-echo.is-preview::before {
          opacity: 1;
          filter: blur(6px);
          transform: scaleX(1.45) scaleY(2.2);
        }

        .mirror-echo.is-preview i {
          opacity: 1;
          filter: blur(0.55px);
        }

        .mirror-echo.is-preview::after {
          opacity: 1;
          transform: scaleX(1.16);
        }

        .mirror-echo.is-armed::before {
          background:
            radial-gradient(ellipse at 50% 55%, rgba(238, 224, 166, 0.76), rgba(226, 208, 151, 0.28) 28%, transparent 70%),
            linear-gradient(90deg, transparent, rgba(238, 224, 166, 0.52) 48%, rgba(248, 236, 195, 0.44) 54%, transparent 100%);
        }

        .mirror-echo.is-chase {
          --echo-strength: 0.54;
          --echo-label: 0.07;
          --echo-blur: 0.8px;
        }

        .mirror-echo.is-chase::before {
          animation: chaseFlash 2.4s steps(1, end) var(--inner-delay) infinite;
        }

        .mirror-echo.is-hold {
          --echo-strength: 0.12;
          --echo-label: 0.014;
          --echo-blur: 2.8px;
        }

        .mirror-echo.is-hold::before {
          filter: blur(14px);
          transform: scaleX(0.74) scaleY(0.72);
        }

        .mirror-echo.is-fantasy {
          --echo-strength: 0.14;
          --echo-label: 0.018;
          --echo-blur: 3.4px;
        }

        .mirror-echo.is-fantasy::before,
        .mirror-echo.is-fantasy i {
          filter: blur(5px);
        }

        .mirror-echo.is-gamble {
          --echo-strength: 0.34;
          --echo-label: 0.042;
          --echo-blur: 1px;
        }

        .mirror-echo.is-gamble::before {
          animation: gambleFlare 3.1s cubic-bezier(0.58, 0, 0.28, 1) var(--inner-delay) infinite;
        }

        .mirror-echo.is-herd {
          --echo-strength: 0.24;
          --echo-label: 0.03;
          --echo-blur: 1.4px;
        }

        .mirror-echo.is-hesitate {
          --echo-strength: 0.15;
          --echo-label: 0.018;
          --echo-blur: 2px;
        }

        .mirror-echo.is-delay {
          --echo-strength: 0.09;
          --echo-label: 0.012;
          --echo-blur: 3px;
        }

        .mirror-echo.is-anxiety {
          --echo-strength: 0.18;
          --echo-label: 0.02;
          --echo-blur: 1.2px;
          filter: blur(var(--echo-blur)) contrast(1.08);
        }

        .mirror-echo.is-anxiety::after {
          opacity: 0.9;
          filter: blur(0.12px);
        }

        .mirror-echo.is-liangzhi {
          --echo-strength: 0.16;
          --echo-label: 0.024;
          --echo-blur: 1.8px;
        }

        .mirror-echo.is-chase {
          animation:
            mirrorEchoWake 2200ms cubic-bezier(0.16, 1, 0.3, 1) var(--delay) forwards,
            mirrorAxisLifeChase var(--axis-cycle) ease-in-out var(--axis-delay) infinite;
        }

        .mirror-echo.is-hold {
          animation:
            mirrorEchoWake 2400ms cubic-bezier(0.16, 1, 0.3, 1) var(--delay) forwards,
            mirrorAxisLifeHold var(--axis-cycle) ease-in-out var(--axis-delay) infinite;
        }

        .mirror-echo.is-fantasy {
          animation:
            mirrorEchoWake 2400ms cubic-bezier(0.16, 1, 0.3, 1) var(--delay) forwards,
            mirrorAxisLifeFantasy var(--axis-cycle) ease-in-out var(--axis-delay) infinite;
        }

        .mirror-echo.is-gamble {
          animation:
            mirrorEchoWake 2200ms cubic-bezier(0.16, 1, 0.3, 1) var(--delay) forwards,
            mirrorAxisLifeGamble var(--axis-cycle) ease-in-out var(--axis-delay) infinite;
        }

        .mirror-echo.is-herd {
          animation:
            mirrorEchoWake 2300ms cubic-bezier(0.16, 1, 0.3, 1) var(--delay) forwards,
            mirrorAxisLifeHerd var(--axis-cycle) ease-in-out var(--axis-delay) infinite;
        }

        .mirror-echo.is-hesitate {
          animation:
            mirrorEchoWake 2400ms cubic-bezier(0.16, 1, 0.3, 1) var(--delay) forwards,
            mirrorAxisLifeHesitate var(--axis-cycle) ease-in-out var(--axis-delay) infinite;
        }

        .mirror-echo.is-delay {
          animation:
            mirrorEchoWake 2600ms cubic-bezier(0.16, 1, 0.3, 1) var(--delay) forwards,
            mirrorAxisLifeDelay var(--axis-cycle) ease-in-out var(--axis-delay) infinite;
        }

        .mirror-echo.is-anxiety {
          animation:
            mirrorEchoWake 2100ms cubic-bezier(0.16, 1, 0.3, 1) var(--delay) forwards,
            mirrorAxisLifeAnxiety var(--axis-cycle) ease-in-out var(--axis-delay) infinite;
        }

        .mirror-echo.is-liangzhi {
          animation:
            mirrorEchoWake 2600ms cubic-bezier(0.16, 1, 0.3, 1) var(--delay) forwards,
            mirrorAxisLifeLiangzhi var(--axis-cycle) ease-in-out var(--axis-delay) infinite;
        }

        .mirror-echo-field.is-absorbing .mirror-echo.is-selected {
          animation: mirrorEchoAbsorb var(--absorb-duration) cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .mirror-echo-field.is-absorbing .mirror-echo.is-selected.is-chase {
          animation: mirrorEchoAbsorbChase var(--absorb-duration) cubic-bezier(0.12, 0.9, 0.2, 1) forwards;
        }

        .mirror-echo-field.is-absorbing .mirror-echo.is-selected.is-hold {
          animation: mirrorEchoAbsorbHold var(--absorb-duration) cubic-bezier(0.28, 0.04, 0.44, 1) forwards;
        }

        .mirror-echo-field.is-absorbing .mirror-echo.is-selected.is-fantasy {
          animation: mirrorEchoAbsorbFantasy var(--absorb-duration) cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
        }

        .mirror-echo-field.is-absorbing .mirror-echo.is-selected.is-gamble {
          animation: mirrorEchoAbsorbGamble var(--absorb-duration) cubic-bezier(0.54, 0, 0.16, 1) forwards;
        }

        .mirror-echo-field.is-absorbing .mirror-echo.is-selected.is-herd {
          animation: mirrorEchoAbsorbHerd var(--absorb-duration) cubic-bezier(0.24, 0.12, 0.26, 1) forwards;
        }

        .mirror-echo-field.is-absorbing .mirror-echo.is-selected.is-hesitate {
          animation: mirrorEchoAbsorbHesitate var(--absorb-duration) cubic-bezier(0.32, 0, 0.28, 1) forwards;
        }

        .mirror-echo-field.is-absorbing .mirror-echo.is-selected.is-delay {
          animation: mirrorEchoAbsorbDelay var(--absorb-duration) cubic-bezier(0.34, 0.02, 0.5, 1) forwards;
        }

        .mirror-echo-field.is-absorbing .mirror-echo.is-selected.is-anxiety {
          animation: mirrorEchoAbsorbAnxiety var(--absorb-duration) cubic-bezier(0.2, 0.9, 0.18, 1) forwards;
        }

        .mirror-echo-field.is-absorbing .mirror-echo.is-selected.is-liangzhi {
          animation: mirrorEchoAbsorbLiangzhi var(--absorb-duration) cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .mirror-echo-field.is-absorbing .mirror-echo:not(.is-selected) {
          animation: mirrorEchoSleep 720ms ease forwards;
        }

        .mirror-touch-hint {
          position: absolute;
          left: 50%;
          bottom: clamp(5.8rem, 13vh, 7.8rem);
          z-index: 8;
          width: max-content;
          max-width: calc(100vw - 2rem);
          margin: 0;
          transform: translateX(-50%) translateY(8px);
          color: rgba(232, 228, 210, 0.34);
          font-size: clamp(0.72rem, 1.4vw, 0.86rem);
          line-height: 1.8;
          letter-spacing: 0.18em;
          text-align: center;
          opacity: 0;
          transition:
            opacity 680ms ease,
            transform 680ms ease;
          pointer-events: none;
        }

        .mirror-echo-field.is-hint-visible .mirror-touch-hint {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .zhaoxin-ritual-flow.is-focusing .zhaoxin-copy.is-mirrors {
          opacity: 0;
          transform: translateX(-50%) translateY(-12px) scale(0.97);
          filter: blur(10px);
          transition:
            opacity 460ms ease,
            transform 640ms cubic-bezier(0.16, 1, 0.3, 1),
            filter 640ms ease;
        }

        .growth-proof {
          position: absolute;
          left: 50%;
          bottom: clamp(8rem, 18vh, 11rem);
          z-index: 24;
          display: grid;
          gap: 0.55rem;
          width: min(86vw, 34rem);
          transform: translateX(-50%);
          color: rgba(232, 228, 210, 0.54);
          font-family: var(--font-serif, "Songti SC", serif);
          font-size: clamp(0.82rem, 1.8vw, 1rem);
          line-height: 1.8;
          letter-spacing: 0.13em;
          pointer-events: none;
          animation: zhaoxinFadeIn 1400ms ease forwards;
        }

        .growth-proof span {
          justify-self: center;
          border: 1px solid rgba(216, 183, 111, 0.12);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.16);
          padding: 0.42rem 0.9rem;
          backdrop-filter: blur(10px);
        }

        .ritual-next {
          position: absolute;
          bottom: clamp(2rem, 7vh, 3.5rem);
          left: 50%;
          z-index: 30;
          min-width: min(18rem, calc(100vw - 3rem));
          transform: translateX(-50%);
          border: 1px solid rgba(185, 154, 85, 0.45);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.3);
          padding: 0.9rem 2.5rem;
          color: rgba(215, 194, 138, 0.94);
          font-family: var(--font-serif, "Songti SC", serif);
          font-size: 0.86rem;
          letter-spacing: 0.28em;
          backdrop-filter: blur(14px);
          transition:
            border-color 240ms ease,
            background 240ms ease,
            transform 240ms ease;
          cursor: pointer;
          pointer-events: auto;
        }

        .ritual-next:hover {
          border-color: rgba(216, 183, 111, 0.72);
          background: rgba(185, 154, 85, 0.1);
          transform: translateX(-50%) translateY(-1px);
        }

        .ritual-next:active {
          transform: translateX(-50%) translateY(1px);
        }

        .ritual-next.is-thought-confirm {
          bottom: clamp(5.1rem, 10svh, 7.2rem);
          min-width: min(28rem, calc(100vw - 3.5rem));
          min-height: 4.15rem;
          border-color: rgba(185, 154, 85, 0.48);
          background:
            linear-gradient(180deg, rgba(54, 47, 28, 0.62), rgba(5, 6, 4, 0.9)),
            radial-gradient(ellipse at 50% 0%, rgba(216, 183, 111, 0.12), transparent 72%);
          color: rgba(232, 204, 132, 0.96);
          font-size: clamp(0.95rem, 1.65vw, 1.08rem);
          letter-spacing: 0.42em;
          text-indent: 0.42em;
          white-space: nowrap;
          box-shadow:
            0 24px 62px rgba(0, 0, 0, 0.62),
            0 0 42px rgba(216, 183, 111, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          animation: thoughtActionRise 1500ms cubic-bezier(0.16, 1, 0.3, 1) 1700ms both;
        }

        .ritual-next.is-thought-confirm:hover {
          border-color: rgba(232, 204, 132, 0.68);
          background:
            linear-gradient(180deg, rgba(65, 56, 33, 0.7), rgba(8, 9, 6, 0.9)),
            radial-gradient(ellipse at 50% 0%, rgba(216, 183, 111, 0.18), transparent 72%);
        }

        .ritual-thought-hint {
          position: absolute;
          left: 50%;
          bottom: clamp(2rem, 4.4svh, 3.4rem);
          z-index: 30;
          width: min(90vw, 36rem);
          margin: 0;
          transform: translateX(-50%);
          color: rgba(220, 212, 195, 0.32);
          font-family: var(--font-serif, "Songti SC", serif);
          font-size: clamp(0.95rem, 1.65vw, 1.16rem);
          font-weight: 400;
          line-height: 2.05;
          letter-spacing: 0.08em;
          text-align: center;
          white-space: nowrap;
          pointer-events: none;
          animation: thoughtActionRise 1500ms cubic-bezier(0.16, 1, 0.3, 1) 2050ms both;
        }

        .ritual-next.is-liangzhi-hold {
          overflow: hidden;
        }

        .ritual-next.is-liangzhi-hold::before {
          content: "";
          position: absolute;
          inset: 0;
          transform: scaleX(0);
          transform-origin: left center;
          border-radius: inherit;
          background: linear-gradient(90deg, rgba(216, 183, 111, 0.08), rgba(236, 226, 176, 0.32));
          transition: transform 120ms ease;
          pointer-events: none;
        }

        .ritual-next.is-liangzhi-hold.is-holding::before {
          transform: scaleX(1);
          transition: transform 960ms linear;
        }

        .ritual-next.is-liangzhi-hold span,
        .ritual-next.is-liangzhi-hold {
          position: relative;
        }

        @keyframes sceneCenterBreath {
          0%,
          100% {
            opacity: 0.42;
            transform: translate(-50%, -50%) scaleX(0.86) scaleY(0.78);
          }
          48% {
            opacity: 0.74;
            transform: translate(-50%, -50%) scaleX(1.06) scaleY(1);
          }
        }

        @keyframes sceneTagFloat {
          0%,
          100% {
            transform: translate(-50%, -50%) translateY(0) translateX(0) skewX(0deg);
          }
          46% {
            transform: translate(-50%, -50%) translateY(-7px) translateX(var(--scene-drift)) skewX(var(--scene-skew));
          }
          72% {
            transform: translate(-50%, -50%) translateY(3px) translateX(calc(var(--scene-drift) * -0.34)) skewX(calc(var(--scene-skew) * -0.52));
          }
        }

        @keyframes sceneTagEnterCenter {
          0% {
            left: var(--scene-x);
            top: var(--scene-y);
            opacity: 0.92;
            transform: translate(-50%, -50%) scale(1);
            filter: blur(0);
          }
          42% {
            opacity: 0.96;
            filter: blur(0.2px);
          }
          76% {
            left: 50%;
            top: 58%;
            opacity: 0.72;
            transform: translate(-50%, -50%) scale(0.96);
            filter: blur(2px);
          }
          100% {
            left: 50%;
            top: 58%;
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.82);
            filter: blur(12px);
          }
        }

        @keyframes sceneLakeRipple {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.42);
            filter: blur(0.5px);
          }
          24% {
            opacity: 0.72;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(2.8, 1.82);
            filter: blur(4px);
          }
        }

        @keyframes sceneThoughtRise {
          from {
            opacity: 0;
            transform: translateY(4.6rem) scale(0.96);
            filter: blur(16px);
          }
          42% {
            opacity: 0.5;
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0.2px);
          }
        }

        @keyframes thoughtLakeArrive {
          from {
            opacity: 0;
            filter: blur(10px);
          }
          45% {
            opacity: 0.56;
            filter: blur(6px);
          }
          to {
            opacity: 1;
            filter: blur(0);
          }
        }

        @keyframes thoughtActionRise {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(1.4rem);
            filter: blur(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
            filter: blur(0);
          }
        }

        @keyframes zhaoxinFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes mirrorFocusConverge {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scaleX(0.56) scaleY(0.36);
            filter: blur(14px);
          }
          32% {
            opacity: 0.72;
          }
          62% {
            opacity: 0.96;
            transform: translate(-50%, -50%) scaleX(1.04) scaleY(0.82);
            filter: blur(2px);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scaleX(0.34) scaleY(0.28);
            filter: blur(16px);
          }
        }

        @keyframes mirrorFocusGlyph {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.84);
            filter: blur(12px);
          }
          36% {
            opacity: 0.14;
          }
          58% {
            opacity: 0.32;
            transform: translate(-50%, -50%) scale(1);
            filter: blur(1.8px);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.08);
            filter: blur(10px);
          }
        }

        @keyframes mirrorEchoWake {
          from {
            transform: translate(-50%, -50%) translateY(18px) scaleX(0.62);
          }
          to {
            transform: translate(-50%, -50%) translateY(0) scaleX(1);
          }
        }

        @keyframes mirrorAxisLife {
          0% {
            left: calc(50% + var(--axis-near-x));
            top: 95%;
            opacity: 0;
            filter: blur(8px);
          }
          9% {
            left: calc(50% + var(--axis-near-x));
            top: 92%;
            opacity: var(--life-low);
            filter: blur(6px);
          }
          24% {
            left: calc(50% + var(--axis-mid-x));
            top: var(--my);
            opacity: var(--life-mid);
            filter: blur(var(--echo-blur));
          }
          43% {
            left: calc(50% + var(--axis-dx));
            top: calc(var(--my) - 7vh);
            opacity: var(--life-peak);
            filter: blur(calc(var(--echo-blur) * 0.72));
          }
          61% {
            left: 50%;
            top: 49%;
            opacity: var(--life-vanish);
            filter: blur(6px);
          }
          70% {
            left: 50%;
            top: 46%;
            opacity: 0;
            filter: blur(14px);
          }
          71% {
            left: calc(50% + var(--axis-near-x));
            top: 95%;
            opacity: 0;
            filter: blur(12px);
          }
          100% {
            left: calc(50% + var(--axis-near-x));
            top: 95%;
            opacity: 0;
            filter: blur(12px);
          }
        }

        @keyframes mirrorAxisLifeChase {
          0% {
            left: calc(50% + var(--axis-near-x));
            top: 95%;
            opacity: 0;
            filter: blur(9px);
          }
          10% {
            left: calc(50% + var(--axis-near-x));
            top: 90%;
            opacity: var(--life-low);
            filter: blur(6px);
          }
          24% {
            left: calc(50% + var(--axis-mid-x));
            top: var(--my);
            opacity: var(--life-mid);
            filter: blur(var(--echo-blur));
          }
          31% {
            left: calc(50% + var(--axis-dx));
            top: calc(var(--my) - 8vh);
            opacity: var(--life-peak);
            filter: blur(0.45px);
          }
          38% {
            left: 50%;
            top: calc(var(--my) - 2vh);
            opacity: var(--life-mid);
            filter: blur(1.1px);
          }
          57% {
            left: 50%;
            top: 50%;
            opacity: var(--life-vanish);
            filter: blur(7px);
          }
          68%,
          100% {
            left: calc(50% + var(--axis-near-x));
            top: 95%;
            opacity: 0;
            filter: blur(13px);
          }
        }

        @keyframes mirrorAxisLifeHold {
          0%,
          14% {
            left: calc(50% + var(--axis-near-x));
            top: 96%;
            opacity: 0;
            filter: blur(12px);
          }
          26% {
            left: calc(50% + var(--axis-near-x));
            top: 91%;
            opacity: var(--life-low);
            filter: blur(9px);
          }
          48% {
            left: calc(50% + var(--axis-mid-x));
            top: calc(var(--my) + 4vh);
            opacity: var(--life-mid);
            filter: blur(calc(var(--echo-blur) * 1.08));
          }
          62% {
            left: calc(50% + var(--axis-dx));
            top: calc(var(--my) + 1vh);
            opacity: var(--life-peak);
            filter: blur(var(--echo-blur));
          }
          76% {
            left: 50%;
            top: 54%;
            opacity: var(--life-vanish);
            filter: blur(8px);
          }
          86%,
          100% {
            left: calc(50% + var(--axis-near-x));
            top: 96%;
            opacity: 0;
            filter: blur(14px);
          }
        }

        @keyframes mirrorAxisLifeFantasy {
          0% {
            left: calc(50% + var(--axis-near-x));
            top: 96%;
            opacity: 0;
            filter: blur(14px);
          }
          17% {
            left: calc(50% + var(--axis-near-x));
            top: 91%;
            opacity: var(--life-low);
            filter: blur(11px);
          }
          36% {
            left: calc(50% + var(--axis-mid-x));
            top: var(--my);
            opacity: var(--life-mid);
            filter: blur(5px);
          }
          51% {
            left: calc(50% - var(--axis-dx));
            top: calc(var(--my) - 5vh);
            opacity: var(--life-peak);
            filter: blur(3.6px);
          }
          70% {
            left: 50%;
            top: 51%;
            opacity: var(--life-vanish);
            filter: blur(11px);
          }
          80%,
          100% {
            left: calc(50% + var(--axis-near-x));
            top: 96%;
            opacity: 0;
            filter: blur(16px);
          }
        }

        @keyframes mirrorAxisLifeGamble {
          0% {
            left: calc(50% + var(--axis-near-x));
            top: 95%;
            opacity: 0;
            filter: blur(10px);
          }
          11% {
            left: calc(50% + var(--axis-near-x));
            top: 90%;
            opacity: var(--life-low);
          }
          27% {
            left: calc(50% - var(--axis-dx));
            top: var(--my);
            opacity: var(--life-mid);
            filter: blur(var(--echo-blur));
          }
          42% {
            left: calc(50% + var(--axis-dx));
            top: calc(var(--my) - 6vh);
            opacity: var(--life-peak);
            filter: blur(0.5px);
          }
          48% {
            left: 50%;
            top: calc(var(--my) - 3vh);
            opacity: var(--life-mid);
            filter: blur(2px);
          }
          66% {
            left: 50%;
            top: 49%;
            opacity: var(--life-vanish);
            filter: blur(8px);
          }
          78%,
          100% {
            left: calc(50% + var(--axis-near-x));
            top: 95%;
            opacity: 0;
            filter: blur(14px);
          }
        }

        @keyframes mirrorAxisLifeHerd {
          0% {
            left: calc(50% + var(--axis-near-x));
            top: 96%;
            opacity: 0;
            filter: blur(10px);
          }
          12% {
            left: calc(50% + var(--axis-near-x));
            top: 92%;
            opacity: var(--life-low);
          }
          29% {
            left: calc(50% + var(--axis-mid-x));
            top: var(--my);
            opacity: var(--life-mid);
            filter: blur(var(--echo-blur));
          }
          45% {
            left: calc(50% + var(--axis-dx));
            top: calc(var(--my) - 3.8vh);
            opacity: var(--life-peak);
          }
          58% {
            left: calc(50% - var(--axis-dx));
            top: calc(var(--my) - 1.2vh);
            opacity: var(--life-mid);
          }
          72% {
            left: 50%;
            top: 50%;
            opacity: var(--life-vanish);
            filter: blur(8px);
          }
          82%,
          100% {
            left: calc(50% + var(--axis-near-x));
            top: 96%;
            opacity: 0;
            filter: blur(14px);
          }
        }

        @keyframes mirrorAxisLifeHesitate {
          0%,
          11% {
            left: calc(50% + var(--axis-near-x));
            top: 95%;
            opacity: 0;
            filter: blur(10px);
          }
          23% {
            left: calc(50% + var(--axis-near-x));
            top: 90%;
            opacity: var(--life-low);
          }
          38% {
            left: calc(50% - 1.8vw);
            top: var(--my);
            opacity: var(--life-mid);
          }
          47% {
            left: calc(50% + 1.4vw);
            top: calc(var(--my) - 2vh);
            opacity: var(--life-peak);
          }
          57% {
            left: calc(50% - 0.8vw);
            top: calc(var(--my) + 0.6vh);
            opacity: var(--life-mid);
          }
          72% {
            left: 50%;
            top: 50%;
            opacity: var(--life-vanish);
            filter: blur(8px);
          }
          84%,
          100% {
            left: calc(50% + var(--axis-near-x));
            top: 95%;
            opacity: 0;
            filter: blur(14px);
          }
        }

        @keyframes mirrorAxisLifeDelay {
          0%,
          25% {
            left: calc(50% + var(--axis-near-x));
            top: 96%;
            opacity: 0;
            filter: blur(13px);
          }
          42% {
            left: calc(50% + var(--axis-near-x));
            top: 92%;
            opacity: var(--life-low);
          }
          59% {
            left: calc(50% + var(--axis-mid-x));
            top: var(--my);
            opacity: var(--life-mid);
          }
          74% {
            left: calc(50% + var(--axis-dx));
            top: calc(var(--my) - 2.4vh);
            opacity: var(--life-peak);
          }
          86% {
            left: 50%;
            top: 51%;
            opacity: var(--life-vanish);
            filter: blur(9px);
          }
          94%,
          100% {
            left: calc(50% + var(--axis-near-x));
            top: 96%;
            opacity: 0;
            filter: blur(15px);
          }
        }

        @keyframes mirrorAxisLifeAnxiety {
          0% {
            left: calc(50% + var(--axis-near-x));
            top: 95%;
            opacity: 0;
            filter: blur(9px) contrast(1.1);
          }
          10% {
            left: calc(50% + var(--axis-near-x));
            top: 91%;
            opacity: var(--life-low);
          }
          25% {
            left: calc(50% - 0.8vw);
            top: var(--my);
            opacity: var(--life-mid);
            filter: blur(var(--echo-blur)) contrast(1.16);
          }
          32% {
            left: calc(50% + 0.6vw);
            top: calc(var(--my) - 2.6vh);
          }
          39% {
            left: calc(50% - 0.45vw);
            top: calc(var(--my) - 4vh);
            opacity: var(--life-peak);
            filter: blur(0.45px) contrast(1.24);
          }
          55% {
            left: calc(50% + 0.35vw);
            top: calc(var(--my) - 1vh);
            opacity: var(--life-mid);
          }
          68% {
            left: 50%;
            top: 50%;
            opacity: var(--life-vanish);
            filter: blur(8px);
          }
          78%,
          100% {
            left: calc(50% + var(--axis-near-x));
            top: 95%;
            opacity: 0;
            filter: blur(14px);
          }
        }

        @keyframes mirrorAxisLifeLiangzhi {
          0%,
          18% {
            left: calc(50% + var(--axis-near-x));
            top: 95%;
            opacity: 0;
            filter: blur(10px);
          }
          36% {
            left: calc(50% + var(--axis-mid-x));
            top: var(--my);
            opacity: var(--life-mid);
            filter: blur(var(--echo-blur));
          }
          58% {
            left: calc(50% + var(--axis-dx));
            top: calc(var(--my) - 3.2vh);
            opacity: var(--life-peak);
            filter: blur(1.2px);
          }
          78% {
            left: 50%;
            top: 50%;
            opacity: var(--life-vanish);
            filter: blur(7px);
          }
          88%,
          100% {
            left: calc(50% + var(--axis-near-x));
            top: 95%;
            opacity: 0;
            filter: blur(13px);
          }
        }

        @keyframes mirrorChaseLife {
          0%,
          100% {
            left: var(--mx);
            top: var(--my);
          }
          18% {
            left: calc(var(--mx) + 0.6vw);
            top: calc(var(--my) - 2vh);
          }
          26% {
            left: 50%;
            top: 50%;
          }
          34% {
            left: calc(var(--mx) - 0.9vw);
            top: calc(var(--my) + 1.4vh);
          }
          46% {
            left: var(--mx);
            top: var(--my);
          }
        }

        @keyframes mirrorHoldLife {
          0%,
          100% {
            left: var(--mx);
            top: var(--my);
          }
          48% {
            left: calc(var(--mx) - 0.8vw);
            top: calc(var(--my) + 5vh);
          }
          72% {
            left: calc(var(--mx) - 0.4vw);
            top: calc(var(--my) + 3vh);
          }
        }

        @keyframes mirrorFantasyLife {
          0%,
          100% {
            left: var(--mx);
            top: var(--my);
          }
          28% {
            left: calc(var(--mx) + var(--axis-dx));
            top: calc(var(--my) - 4vh);
          }
          54% {
            left: calc(var(--mx) - var(--axis-dx));
            top: calc(var(--my) + 2vh);
          }
          80% {
            left: calc(50% + var(--axis-dx));
            top: 52%;
          }
        }

        @keyframes mirrorGambleLife {
          0%,
          100% {
            left: var(--mx);
            top: var(--my);
          }
          24% {
            left: calc(var(--mx) - 4vw);
            top: calc(var(--my) - 3vh);
          }
          36% {
            left: 50%;
            top: 48%;
          }
          52% {
            left: calc(var(--mx) + 4.6vw);
            top: calc(var(--my) + 2.4vh);
          }
          68% {
            left: var(--mx);
            top: var(--my);
          }
        }

        @keyframes mirrorHerdLife {
          0%,
          100% {
            left: var(--mx);
            top: var(--my);
          }
          32% {
            left: calc(50% + 1.2vw);
            top: 63%;
          }
          58% {
            left: calc(42% + 1.8vw);
            top: 70%;
          }
          78% {
            left: calc(var(--mx) - 1vw);
            top: calc(var(--my) - 1.4vh);
          }
        }

        @keyframes mirrorHesitateLife {
          0%,
          100% {
            left: var(--mx);
            top: var(--my);
          }
          22% {
            left: calc(var(--mx) - 2vw);
            top: calc(var(--my) - 1vh);
          }
          42% {
            left: calc(var(--mx) + 1.8vw);
            top: calc(var(--my) + 0.5vh);
          }
          58% {
            left: calc(var(--mx) - 1.2vw);
            top: calc(var(--my) - 0.6vh);
          }
        }

        @keyframes mirrorDelayLife {
          0%,
          18%,
          100% {
            left: var(--mx);
            top: var(--my);
          }
          62% {
            left: calc(var(--mx) + 1.2vw);
            top: calc(var(--my) - 2vh);
          }
          82% {
            left: calc(var(--mx) + 0.4vw);
            top: calc(var(--my) + 1vh);
          }
        }

        @keyframes mirrorAnxietyLife {
          0%,
          100% {
            left: var(--mx);
            top: var(--my);
          }
          15% {
            left: calc(var(--mx) + 0.55vw);
            top: calc(var(--my) - 0.55vh);
          }
          31% {
            left: calc(var(--mx) - 0.48vw);
            top: calc(var(--my) + 0.35vh);
          }
          48% {
            left: calc(var(--mx) + 0.34vw);
            top: calc(var(--my) + 0.52vh);
          }
          66% {
            left: calc(var(--mx) - 0.62vw);
            top: calc(var(--my) - 0.28vh);
          }
        }

        @keyframes mirrorLiangzhiLife {
          0%,
          100% {
            left: var(--mx);
            top: var(--my);
          }
          50% {
            left: calc(var(--mx) + 0.36vw);
            top: calc(var(--my) - 0.62vh);
          }
        }

        @keyframes chaseFlash {
          0%,
          72%,
          100% {
            opacity: 0.76;
          }
          18%,
          22% {
            opacity: 1;
          }
        }

        @keyframes gambleFlare {
          0%,
          100% {
            opacity: 0.7;
            filter: blur(10px);
          }
          46% {
            opacity: 1;
            filter: blur(6px);
          }
          49% {
            opacity: 0.42;
            filter: blur(14px);
          }
          54% {
            opacity: 1;
            filter: blur(7px);
          }
        }

        @keyframes mirrorInnerDrift {
          0%,
          100% {
            opacity: 0.72;
            transform: translateX(var(--drift-x-start)) skewX(var(--drift-skew-start)) scaleX(0.98);
          }
          50% {
            opacity: 1;
            transform: translateX(var(--drift-x-end)) skewX(var(--drift-skew-end)) scaleX(1.04);
          }
        }

        @keyframes mirrorLightShear {
          0%,
          100% {
            background-position:
              7% 18%,
              50% 50%,
              72% 82%;
            opacity: 0.72;
            transform: skewX(var(--shear-skew-start));
          }
          50% {
            background-position:
              18% 24%,
              46% 48%,
              62% 78%;
            opacity: 1;
            transform: skewX(var(--shear-skew-end));
          }
        }

        @keyframes mirrorEchoAbsorb {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scaleX(1);
            filter: blur(0.35px);
          }
          42% {
            left: 50%;
            top: 61%;
            opacity: 0.92;
            transform: translate(-50%, -50%) scaleX(0.78) scaleY(0.82);
            filter: blur(4px);
          }
          76% {
            left: 50%;
            top: 50%;
            opacity: 0.58;
            transform: translate(-50%, -50%) scaleX(0.36) scaleY(0.52);
            filter: blur(10px);
          }
          100% {
            left: 50%;
            top: 46%;
            opacity: 0;
            transform: translate(-50%, -50%) scaleX(0.12) scaleY(0.3);
            filter: blur(15px);
          }
        }

        @keyframes mirrorEchoAbsorbChase {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scaleX(1.18) scaleY(1.08);
            filter: blur(0.2px);
          }
          26% {
            left: 50%;
            top: 58%;
            opacity: 1;
            transform: translate(-50%, -50%) scaleX(0.86) scaleY(0.78);
            filter: blur(2px);
          }
          62% {
            left: 50%;
            top: 49%;
            opacity: 0.56;
            transform: translate(-50%, -50%) scaleX(0.34) scaleY(0.5);
            filter: blur(9px);
          }
          100% {
            left: 50%;
            top: 45%;
            opacity: 0;
            transform: translate(-50%, -50%) scaleX(0.1) scaleY(0.28);
            filter: blur(16px);
          }
        }

        @keyframes mirrorEchoAbsorbHold {
          0% {
            opacity: 0.94;
            transform: translate(-50%, -50%) scaleX(0.96) scaleY(1);
            filter: blur(1.2px);
          }
          34% {
            left: calc(50% - 1.5vw);
            top: 70%;
            opacity: 0.82;
            transform: translate(-50%, -50%) scaleX(0.92) scaleY(0.84);
            filter: blur(5px);
          }
          72% {
            left: 50%;
            top: 54%;
            opacity: 0.46;
            transform: translate(-50%, -50%) scaleX(0.34) scaleY(0.52);
            filter: blur(10px);
          }
          100% {
            left: 50%;
            top: 48%;
            opacity: 0;
            transform: translate(-50%, -50%) scaleX(0.1) scaleY(0.26);
            filter: blur(17px);
          }
        }

        @keyframes mirrorEchoAbsorbFantasy {
          0% {
            opacity: 0.88;
            transform: translate(-50%, -50%) scaleX(1.02);
            filter: blur(4px);
          }
          38% {
            left: calc(50% + 2vw);
            top: 60%;
            opacity: 0.62;
            transform: translate(-50%, -50%) scaleX(0.68) scaleY(0.72);
            filter: blur(9px);
          }
          78% {
            left: 50%;
            top: 50%;
            opacity: 0.26;
            transform: translate(-50%, -50%) scaleX(0.24) scaleY(0.42);
            filter: blur(16px);
          }
          100% {
            left: 50%;
            top: 46%;
            opacity: 0;
            transform: translate(-50%, -50%) scaleX(0.08) scaleY(0.26);
            filter: blur(21px);
          }
        }

        @keyframes mirrorEchoAbsorbGamble {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scaleX(1.08);
            filter: blur(0.6px);
          }
          22% {
            left: calc(50% - 3vw);
            top: 63%;
            opacity: 0.78;
            transform: translate(-50%, -50%) scaleX(1.02) scaleY(0.82);
            filter: blur(4px);
          }
          44% {
            left: 50%;
            top: 56%;
            opacity: 1;
            transform: translate(-50%, -50%) scaleX(0.64) scaleY(0.68);
            filter: blur(2px);
          }
          76% {
            left: 50%;
            top: 49%;
            opacity: 0.42;
            transform: translate(-50%, -50%) scaleX(0.28) scaleY(0.44);
            filter: blur(12px);
          }
          100% {
            left: 50%;
            top: 45%;
            opacity: 0;
            transform: translate(-50%, -50%) scaleX(0.08) scaleY(0.24);
            filter: blur(18px);
          }
        }

        @keyframes mirrorEchoAbsorbHerd {
          0% {
            opacity: 0.88;
            transform: translate(-50%, -50%) scaleX(1);
            filter: blur(1px);
          }
          30% {
            left: calc(50% + 2.2vw);
            top: 65%;
            opacity: 0.72;
            transform: translate(-50%, -50%) scaleX(0.82) scaleY(0.82);
            filter: blur(4px);
          }
          58% {
            left: calc(50% - 0.8vw);
            top: 56%;
            opacity: 0.62;
            transform: translate(-50%, -50%) scaleX(0.52) scaleY(0.62);
            filter: blur(8px);
          }
          100% {
            left: 50%;
            top: 46%;
            opacity: 0;
            transform: translate(-50%, -50%) scaleX(0.1) scaleY(0.28);
            filter: blur(16px);
          }
        }

        @keyframes mirrorEchoAbsorbHesitate {
          0% {
            opacity: 0.86;
            transform: translate(-50%, -50%) scaleX(1);
            filter: blur(1.2px);
          }
          24% {
            left: calc(50% - 2vw);
            top: 62%;
            opacity: 0.76;
          }
          44% {
            left: calc(50% + 1.4vw);
            top: 59%;
            opacity: 0.72;
            transform: translate(-50%, -50%) scaleX(0.72) scaleY(0.74);
            filter: blur(5px);
          }
          68% {
            left: 50%;
            top: 51%;
            opacity: 0.46;
            transform: translate(-50%, -50%) scaleX(0.34) scaleY(0.48);
            filter: blur(10px);
          }
          100% {
            left: 50%;
            top: 46%;
            opacity: 0;
            transform: translate(-50%, -50%) scaleX(0.09) scaleY(0.24);
            filter: blur(17px);
          }
        }

        @keyframes mirrorEchoAbsorbDelay {
          0%,
          24% {
            opacity: 0.78;
            transform: translate(-50%, -50%) scaleX(0.96);
            filter: blur(2.4px);
          }
          52% {
            left: calc(50% + 1vw);
            top: 63%;
            opacity: 0.58;
            transform: translate(-50%, -50%) scaleX(0.68) scaleY(0.72);
            filter: blur(8px);
          }
          82% {
            left: 50%;
            top: 51%;
            opacity: 0.3;
            transform: translate(-50%, -50%) scaleX(0.3) scaleY(0.42);
            filter: blur(12px);
          }
          100% {
            left: 50%;
            top: 47%;
            opacity: 0;
            transform: translate(-50%, -50%) scaleX(0.08) scaleY(0.24);
            filter: blur(18px);
          }
        }

        @keyframes mirrorEchoAbsorbAnxiety {
          0% {
            opacity: 0.9;
            transform: translate(-50%, -50%) scaleX(0.92);
            filter: blur(0.6px) contrast(1.18);
          }
          18% {
            left: calc(50% + 1vw);
            top: 62%;
          }
          30% {
            left: calc(50% - 0.8vw);
            top: 59%;
          }
          52% {
            left: calc(50% + 0.5vw);
            top: 54%;
            opacity: 0.62;
            transform: translate(-50%, -50%) scaleX(0.42) scaleY(0.52);
            filter: blur(7px) contrast(1.12);
          }
          100% {
            left: 50%;
            top: 46%;
            opacity: 0;
            transform: translate(-50%, -50%) scaleX(0.08) scaleY(0.22);
            filter: blur(16px);
          }
        }

        @keyframes mirrorEchoAbsorbLiangzhi {
          0% {
            opacity: 0.86;
            transform: translate(-50%, -50%) scaleX(1);
            filter: blur(1px);
          }
          48% {
            left: 50%;
            top: 58%;
            opacity: 0.72;
            transform: translate(-50%, -50%) scaleX(0.6) scaleY(0.66);
            filter: blur(5px);
          }
          82% {
            left: 50%;
            top: 50%;
            opacity: 0.42;
            transform: translate(-50%, -50%) scaleX(0.28) scaleY(0.42);
            filter: blur(10px);
          }
          100% {
            left: 50%;
            top: 46%;
            opacity: 0;
            transform: translate(-50%, -50%) scaleX(0.08) scaleY(0.24);
            filter: blur(16px);
          }
        }

        @keyframes mirrorEchoSleep {
          from {
            opacity: 0.7;
            transform: translate(-50%, -50%) scaleX(1);
          }
          to {
            opacity: 0;
            filter: blur(12px);
            transform: translate(-50%, -50%) translateY(0.4rem) scaleX(0.52);
          }
        }

        @keyframes thiefInkRise {
          from {
            opacity: 0;
            transform: translateY(22px) scale(1.08);
            filter: blur(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0.2px);
          }
        }

        @keyframes thiefWaterWaver {
          0%,
          100% {
            transform: translateY(0) skewX(0deg);
            text-shadow:
              0 0 28px rgba(126, 42, 31, 0.34),
              0 18px 46px rgba(0, 0, 0, 0.72);
          }
          46% {
            transform: translateY(1px) skewX(-0.8deg);
            text-shadow:
              0 0 34px rgba(126, 42, 31, 0.42),
              0 20px 50px rgba(0, 0, 0, 0.76);
          }
          72% {
            transform: translateY(-0.5px) skewX(0.55deg);
          }
        }

        @keyframes thiefRipple {
          0% {
            opacity: 0;
            transform: translateX(-50%) scaleX(0.32) scaleY(0.4);
            filter: blur(8px);
          }
          42% {
            opacity: 0.78;
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) scaleX(1.4) scaleY(1);
            filter: blur(5px);
          }
        }

        @media (max-width: 640px) {
          .zhaoxin-copy {
            top: 29%;
          }

          .zhaoxin-copy.is-scene {
            top: clamp(2.6rem, 7.2svh, 4.4rem);
          }

          .zhaoxin-copy.is-scene h1 {
            font-size: clamp(1.18rem, 6.2vw, 1.72rem);
            line-height: 1.64;
            letter-spacing: 0.08em;
          }

          .zhaoxin-copy.is-thought {
            top: 35%;
          }

          .zhaoxin-copy h1 {
            letter-spacing: 0.1em;
          }

          .zhaoxin-copy p {
            letter-spacing: 0.08em;
          }

          .scene-float-field::before {
            top: 61%;
            width: 112vw;
            height: 44svh;
          }

          .scene-lake-center,
          .scene-lake-ripple {
            top: 61%;
          }

          .scene-float-tag {
            left: clamp(16%, var(--scene-x), 84%);
            top: clamp(29%, var(--scene-y), 88%);
            padding: 0.34rem 0.62rem;
            font-size: clamp(0.68rem, 3.2vw, 0.8rem);
            letter-spacing: 0.08em;
          }

          .scene-float-field.is-absorbing .scene-float-tag.is-selected {
            animation-name: sceneTagEnterCenterMobile;
          }

          .mirror-echo {
            width: clamp(3.6rem, calc(var(--mw) * 1.22), 12rem);
            height: clamp(1.1rem, 4vw, 2.2rem);
          }

          .mirror-echo b {
            font-size: 0.62rem;
            letter-spacing: 0.14em;
          }

          .mirror-echo em {
            display: none;
          }

          .mirror-echo.is-hold,
          .mirror-echo.is-fantasy,
          .mirror-echo.is-delay,
          .mirror-echo.is-anxiety {
            opacity: 0.55;
          }
        }

        @keyframes sceneTagEnterCenterMobile {
          0% {
            left: clamp(16%, var(--scene-x), 84%);
            top: clamp(29%, var(--scene-y), 88%);
            opacity: 0.92;
            transform: translate(-50%, -50%) scale(1);
            filter: blur(0);
          }
          76% {
            left: 50%;
            top: 61%;
            opacity: 0.72;
            transform: translate(-50%, -50%) scale(0.96);
            filter: blur(2px);
          }
          100% {
            left: 50%;
            top: 61%;
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.82);
            filter: blur(12px);
          }
        }
      `}</style>
    </section>
  )
}
