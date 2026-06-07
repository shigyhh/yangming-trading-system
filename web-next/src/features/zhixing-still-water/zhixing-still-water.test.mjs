import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("./StillWaterZhixingScroll.tsx", import.meta.url)
const heartMirrorUrl = new URL("./HeartMirrorScroll.tsx", import.meta.url)
const partsUrl = new URL("./StillWaterRitualParts.tsx", import.meta.url)
const stageUrl = new URL("./HeartLakeStage.tsx", import.meta.url)
const sharedStageUrl = new URL("../heart-lake/HeartLakeStage.tsx", import.meta.url)
const audioUrl = new URL("./stillWaterAudio.ts", import.meta.url)
const engineUrl = new URL("./stillWaterScrollEngine.ts", import.meta.url)
const holdComponentUrl = new URL("../../components/mirror-scroll/HoldToReleaseThought.tsx", import.meta.url)
const holdStylesUrl = new URL("../../components/mirror-scroll/HoldToReleaseThought.module.css", import.meta.url)
const routeUrl = new URL("../../app/zhixing-still-water/page.tsx", import.meta.url)
const topNavUrl = new URL("../../components/home/top-nav.tsx", import.meta.url)

test("still-water zhixing scroll exposes a separate ritual route", async () => {
  const page = await readFile(pageUrl, "utf8")
  const heartMirror = await readFile(heartMirrorUrl, "utf8")
  const parts = await readFile(partsUrl, "utf8")
  const stage = await readFile(stageUrl, "utf8")
  const sharedStage = await readFile(sharedStageUrl, "utf8")
  const audio = await readFile(audioUrl, "utf8")
  const engine = await readFile(engineUrl, "utf8")
  const holdComponent = await readFile(holdComponentUrl, "utf8")
  const holdStyles = await readFile(holdStylesUrl, "utf8")
  const route = await readFile(routeUrl, "utf8")
  const topNav = await readFile(topNavUrl, "utf8")

  assert.ok(route.includes("HeartMirrorScroll"), "route must mount the heart mirror scroll")
  assert.ok(heartMirror.includes("HeartMirrorScroll"), "feature entry should expose the named heart mirror scroll")
  assert.ok(topNav.includes('href: "/reflect"'), "desktop nav should keep 照见 as the primary daily entry")
  assert.equal(topNav.includes('href="/zhixing-still-water"'), false, "home mobile nav should not expose the still-water directory as a first-screen entrance")

  const ritualSource = [page, parts, stage, sharedStage, audio, holdComponent, holdStyles].join("\n")

  ;[
    "MirrorRiverScroll",
    "FloatingThought",
    "floatingThoughts",
    "heart-lake-floating-thoughts",
    "heart-lake-depth-shadow",
    "heart-lake-seal-layer",
    "HeartMirrorScroll",
    "HeartLakeStage",
    "HeartLakeEngine",
    "heart-lake-scroll-backdrop",
    "continuous-scroll-mark",
    "open-scroll-button",
    "scroll-foreshadow",
    "scrollLeafOpenLeft",
    "scrollLeafOpenRight",
    "scrollLightSeam",
    "heart-lake-root",
    "heart-lake-bg",
    "heart-lake-water",
    "heart-lake-ripples",
    "heart-lake-mist",
    "heart-lake-particles",
    "heart-lake-content",
    "triggerRippleKey",
    "心镜长卷",
    "不是记录你做过什么。",
    "而是记录你一次次看见了谁在下单。",
    "一念落水",
    "交易现场：",
    "心贼显影",
    "这一念里，最重的是：",
    "九镜显影",
    "你最容易进入：",
    "它不是你。只是你最常进入的房间。",
    "一念被看穿",
    "reflection-strike",
    "beat-",
    "water-crack",
    "知行合一手势",
    "HoldToReleaseThought",
    "长按这一念，让它沉入水底。",
    "hold-release-root",
    "water-pressure-ring",
    "ink-dissolve-layer",
    "thought-text",
    "thought-ghost",
    "completed-seal",
    "知而不行，只是未知。",
    "今日这一念，已被你亲手放下。",
    "已照见",
    "致良知，不是消灭念头。",
    "是念起时，知道是谁在下单。",
    "原来，我一直照的，是自己的心。",
    "明日再照。",
    "今日照见总结",
    "今日照见已落印",
    "本次照见",
    "起念场景",
    "今日心证",
    "今日修行",
    "进入心镜长卷",
    "返回今日一念",
    "查看心镜档案",
    "重新入照心",
    "查看复测变化",
    "查看心镜档案馆",
    "回到今日",
    "只看心贼",
    "只看镜",
    "still-scroller",
    "scroll-snap-type: y proximity",
    "still-mist",
    "still-lake-surface",
    "ink-bleed-defs",
    "InkText",
    "thief-shadow",
    "mirror-pool",
    "zhu-seal",
    "backlight-proof",
    "echo-rings",
  ].forEach((token) => {
    assert.ok(ritualSource.includes(token), `ritual source missing token: ${token}`)
  })

  ;[
    "buildStillWaterScrollData",
    "OneThoughtRecord",
    "createTodayInsightRecord",
    "saveToArchive",
    "appendToMirrorScroll",
    "TodayInsightRecordInput",
    "stillWaterApiEndpoints",
    "/api/v1/mirror-scroll/records",
    "/api/v1/mirror-scroll/seal",
    "/api/v1/one-thought/record",
    "getMirrorName",
    "getPrimaryThief",
    "groupRepeatedThoughts",
    "getTopThought",
    "getThiefTrend",
    "createLongScrollNodes",
    "formatThoughtLabel",
    "第${chineseNumbers[dayIndex]}念",
    "repeatCount",
    "thiefStreak",
    "waterTone",
    "hasSevenSealLine",
    "filterStillWaterRecords",
    "getStillWaterMirrorOptions",
  ].forEach((token) => {
    assert.ok(engine.includes(token), `engine missing data token: ${token}`)
  })

  assert.ok(ritualSource.includes("这一念，正在变轻。"), "page should render the lightening insight sentence")
})

test("hold-to-release thought uses pointer-driven ritual progress", async () => {
  const holdComponent = await readFile(holdComponentUrl, "utf8")
  const holdStyles = await readFile(holdStylesUrl, "utf8")
  const combined = `${holdComponent}\n${holdStyles}`

  ;[
    "type HoldState = \"idle\" | \"pressing\" | \"released\" | \"completed\"",
    "durationMs = 1600",
    "setPointerCapture",
    "releasePointerCapture",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "completedRef",
    "onCompleteRef.current()",
    "--progress",
    "prefers-reduced-motion: reduce",
    "sealDrop",
  ].forEach((token) => {
    assert.ok(combined.includes(token), `hold release component missing token: ${token}`)
  })

  ;[
    "loading",
    "spinner",
    "hiddenThought",
  ].forEach((forbidden) => {
    assert.equal(combined.includes(forbidden), false, `hold release component should not contain: ${forbidden}`)
  })
})

test("still-water zhixing scroll keeps compliance boundaries", async () => {
  const combined = [
    await readFile(pageUrl, "utf8"),
    await readFile(partsUrl, "utf8"),
    await readFile(stageUrl, "utf8"),
    await readFile(audioUrl, "utf8"),
    await readFile(engineUrl, "utf8"),
    await readFile(holdComponentUrl, "utf8"),
    await readFile(holdStylesUrl, "utf8"),
  ].join("\n")

  assert.ok(combined.includes("本系统用于交易心理觉察与行为训练，不构成投资建议。"))

  ;[
    "hiddenThought",
    "推荐买入",
    "推荐卖出",
    "目标价",
    "收益保证",
    "稳赚",
    "必赚",
    "抄底",
    "逃顶",
    "Day001",
    "打卡",
    "签到日历",
    "收益曲线",
    "still-water-spine",
  ].forEach((forbidden) => {
    assert.equal(combined.includes(forbidden), false, `forbidden token leaked into still-water scroll: ${forbidden}`)
  })
})
