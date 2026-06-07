import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("./ZhixingScrollHome.tsx", import.meta.url)
const definitionsUrl = new URL("./zhixingScrollDefinitions.ts", import.meta.url)
const storeUrl = new URL("./zhixingScrollStore.ts", import.meta.url)
const routeUrl = new URL("../../app/zhixing-scroll/page.tsx", import.meta.url)
const globalsUrl = new URL("../../app/globals.css", import.meta.url)
const topNavUrl = new URL("../../components/home/top-nav.tsx", import.meta.url)

test("zhixing scroll keeps the daily practice loop as the primary route", async () => {
  const page = await readFile(pageUrl, "utf8")
  const definitions = await readFile(definitionsUrl, "utf8")
  const store = await readFile(storeUrl, "utf8")
  const route = await readFile(routeUrl, "utf8")
  const globals = await readFile(globalsUrl, "utf8")
  const topNav = await readFile(topNavUrl, "utf8")

  assert.ok(route.includes("ZhixingScrollHome"), "route must mount the new zhixing scroll home")
  assert.ok(globals.includes("Zhixing scroll critical shell"), "hero must have critical CSS before hydration")
  assert.ok(globals.includes(".zhixing-hero"), "critical CSS must style the entry hero before client CSS loads")
  assert.ok(globals.includes("white-space: nowrap"), "desktop hero title should not break into a lonely final character")
  assert.ok(topNav.includes('href: "/reflect"'), "home top nav should route the daily practice loop through /reflect")
  assert.equal(topNav.includes('href="/zhixing-scroll"'), false, "home top nav should not expose the old scroll directory as the primary mobile entrance")

  ;[
    "交易前，先展开一卷。",
    "市场未动，心已先动。",
    "一念不照，万法皆乱。",
    "开始今日一卷",
    "90 秒看懂知行心卷",
    "临盘心乱，先急救",
    "EntryGateHero",
    "InkMistStage",
    "EnterScrollTransition",
    "ScrollNarrativeContainer",
    "ScrollNode",
    "PerspectiveScrollNarrative",
    "DepthScrollStage",
    "DepthScrollNode",
    "InkPathSpine",
    "MistDepthLayer",
    "EntryStage",
    "setEntryStage(\"entering\")",
    "ENTRY_TRANSITION_MS",
    "scrollProgress",
    "relativeDepth",
    "depth-scroll-node--active",
    "depth-scroll-node--past",
    "depth-scroll-node--future",
    "aria-current={isNear ? \"step\" : undefined}",
    "getDepthNodeCopy",
    "depth-scroll-compliance",
    "zhixing-page--entering",
    "zhixing-page--entered",
    "入照心",
  ].forEach((copy) => {
    assert.ok(page.includes(copy), `missing first-screen copy: ${copy}`)
  })

  ;[
    "daily-scroll",
    "today-thought",
    "heart-thief",
    "nine-mirror",
    "daily-evidence",
    "daily-practice",
    "liangzhi-seal",
    "daily-verdict",
    "heart-archive",
    "hundred-day-scroll",
    "course-live",
  ].forEach((nodeId) => {
    assert.ok(definitions.includes(`id: "${nodeId}"`), `missing zhixing node: ${nodeId}`)
  })

  assert.ok(definitions.indexOf('id: "daily-scroll"') < definitions.indexOf('id: "today-thought"'))
  assert.ok(definitions.includes('title: "入照心"'), "first node should be 入照心, not a generic page label")
  assert.ok(definitions.includes('buttonLabel: "开始照心"'), "first node should continue the ritual after entry")
  assert.ok(definitions.indexOf('id: "today-thought"') < definitions.indexOf('id: "heart-thief"'))
  assert.ok(definitions.indexOf('id: "heart-thief"') < definitions.indexOf('id: "nine-mirror"'))
  assert.ok(definitions.indexOf('id: "daily-practice"') < definitions.indexOf('id: "liangzhi-seal"'))
  assert.ok(definitions.indexOf('id: "liangzhi-seal"') < definitions.indexOf('id: "daily-verdict"'))
  assert.ok(definitions.indexOf('id: "hundred-day-scroll"') < definitions.indexOf('id: "course-live"'))

  ;["贪镜", "惧镜", "急镜", "悔镜", "赌镜", "扛镜", "乱镜", "疑镜", "慢镜"].forEach((mirrorName) => {
    assert.ok(definitions.includes(`name: "${mirrorName}"`), `missing mirror definition: ${mirrorName}`)
  })

  ;["不追印", "不扛印", "轻仓印", "等待印", "止损印", "复盘印", "休市印", "认错印", "减频印", "守规印", "静观印", "知行印"].forEach((sealName) => {
    assert.ok(definitions.includes(`name: "${sealName}"`), `missing seal definition: ${sealName}`)
  })

  assert.ok(store.includes("ym_zhixing_daily_scroll_v1"), "daily scroll must persist with a dedicated storage key")
  assert.ok(store.includes("completeZhixingNode"), "daily scroll must expose a completion state transition")
  assert.ok(store.includes("buildDailyVerdict"), "state transition must generate the daily verdict")
  assert.ok(store.includes("sealId: seal.id"), "daily verdict must be generated from the current mirror and seal")
  assert.ok(store.includes("今日先照见："), "old stored verdicts should be migrated away from long stitched copy")
  assert.ok(definitions.includes("dailyVerdictByMirrorSeal"), "verdicts should be mapped by mirror and daily seal")
  assert.ok(definitions.includes("急念已起，心欲逐影。今日宜守等待之印，不以错过为亏。"), "urgent mirror verdict should be concise and shareable")
  assert.ok(definitions.includes("不甘为贼，幻想为绳。今日所修，不在胜负，在能否及时认错。"), "hold mirror verdict should be concise and shareable")
  assert.ok(definitions.includes("惧念生于得失。今日宜观波动，不因小利而乱出。"), "fear mirror verdict should be concise and shareable")
  assert.ok(definitions.includes("镜课训练"), "node chain should include mirror-specific course training")
  assert.ok(definitions.includes("急镜：从冲动交易回到等待规则"), "urgent mirror should have a natural course title")
  assert.ok(definitions.includes("如果你经常因为怕错过而提前进场"), "urgent mirror course copy should match the current problem")
  assert.equal(page.includes("DailyLessonCard"), false, "entered state should not append a flat daily lesson section after the perspective scroll")
  assert.equal(page.includes("DailyVerdictCard"), false, "daily verdict should stay in the perspective node instead of a flat card")
  assert.equal(page.includes("MirrorCourseCard"), false, "mirror course should not append a flat card after the perspective scroll")
  assert.equal(page.includes('<section id="live-demo"'), false, "live demo should not turn entered state back into a normal long page")
  assert.equal(page.includes("<table"), false, "daily lesson should not become a complex table")
  assert.equal(page.includes("<textarea"), false, "daily lesson should not ask users to fill a form")
  assert.equal(page.includes("<input"), false, "daily lesson should stay focused on the one daily practice")
})

test("zhixing scroll avoids forbidden investment and cheap scroll visuals", async () => {
  const combined = [
    await readFile(pageUrl, "utf8"),
    await readFile(definitionsUrl, "utf8"),
    await readFile(storeUrl, "utf8"),
  ].join("\n")

  ;[
    "荐股",
    "喊单",
    "不承诺收益",
  ].forEach((allowedComplianceWord) => {
    assert.ok(combined.includes(allowedComplianceWord), `compliance line should include: ${allowedComplianceWord}`)
  })

  ;[
    "推荐买入",
    "推荐卖出",
    "目标价",
    "稳赚",
    "翻倍",
    "保本",
    "羊皮纸",
    "木轴",
    "祥云",
    "LiveDemoMode",
    "scrollLeft",
    "${template}",
  ].forEach((forbidden) => {
    assert.equal(combined.includes(forbidden), false, `forbidden phrase or mechanic leaked into zhixing scroll: ${forbidden}`)
  })

  ;[
    "推荐买入",
    "推荐卖出",
    "买点",
    "卖点",
  ].forEach((forbiddenAdvice) => {
    assert.equal(combined.includes(forbiddenAdvice), false, `daily verdict must not drift into trading advice: ${forbiddenAdvice}`)
  })

  assert.ok(combined.includes("#050807"), "visual system should preserve the deep ink direction")
  assert.ok(combined.includes("当前节点如灯") || combined.includes("zhixing-node--current"), "current node should be visually emphasized")
  assert.ok(combined.includes("zhixing-mist"), "visual system must include ink mist")
  assert.ok(combined.includes("zhixing-dust"), "visual system must include restrained golden dust")
  assert.ok(combined.includes("zhixing-dust--gathering"), "entry animation should gently gather the golden dust")
  assert.ok(combined.includes("heroFadeDown"), "entry animation should fade the hero instead of hard jumping")
  assert.ok(combined.includes("heartFireAwaken"), "entry animation should awaken the center heart fire")
  assert.ok(combined.includes("goldenSpineReveal"), "entry animation should reveal the mist scroll spine")
  assert.ok(combined.includes("nodeFromMist"), "first node should appear from mist")
  assert.ok(combined.includes("futureNodeBreath"), "future nodes should breathe faintly in the mist")
  assert.ok(combined.includes("depth-scroll-stage"), "entered state should use a sticky perspective stage")
  assert.ok(combined.includes("position: sticky"), "depth stage should stay fixed while the user walks the scroll")
  assert.ok(combined.includes("height: 100vh"), "depth stage should occupy one viewport")
  assert.ok(combined.includes("perspective: 1200px"), "depth stage should create spatial depth")
  assert.ok(combined.includes("transform-style: preserve-3d"), "depth nodes should keep 3D transforms")
  assert.ok(combined.includes(".depth-node-layer"), "depth node layer should isolate the 3D node space")
  assert.ok(combined.includes("inset: 0"), "depth node layer should fill the sticky stage")
  assert.ok(combined.includes("pointer-events: none"), "depth node layer should not block the stage")
  assert.ok(combined.includes(".depth-scroll-node"), "depth nodes should have a dedicated 3D positioning rule")
  assert.ok(combined.includes("position: absolute"), "depth nodes should be absolutely positioned inside the sticky stage")
  assert.ok(combined.includes("left: 50%"), "depth nodes should be horizontally centered")
  assert.ok(combined.includes("top: 50%"), "depth nodes should be vertically centered")
  assert.ok(combined.includes("width: min(860px, calc(100vw - 32px))"), "depth nodes should keep the requested responsive width")
  assert.ok(combined.includes("will-change: transform, opacity, filter"), "depth nodes should be optimized for spatial transforms")
  assert.ok(combined.includes("pointer-events: auto"), "depth nodes should remain clickable while the layer stays transparent")
  assert.ok(combined.includes("translate3d(-50%, calc(-50% +"), "nodes should be positioned by relative depth, not a flat list")
  assert.ok(combined.includes("translateZ"), "nodes must move in depth")
  assert.ok(combined.includes("const d = Math.abs(relativeDepth)"), "depth style should be driven by relative depth")
  assert.equal(combined.includes("const isPast = relativeDepth < 0"), false, "depth style should not branch into hard-coded past/future transforms")
  ;[
    "lerp(1, 0.6, d)",
    "lerp(1, 0.9, d)",
    "lerp(0.6, 0.3, d - 1)",
    "lerp(0.9, 0.76, d - 1)",
    "Math.max(0.12, 0.3 - (d - 2) * 0.14)",
    "Math.max(0.64, 0.76 - (d - 2) * 0.1)",
    "const translateZ = -d * 210",
    "const translateY = relativeDepth * 22",
    "const blur = Math.min(12, d * 4)",
    "transform: `translate3d(-50%, calc(-50% + ${translateY}vh), ${translateZ}px) scale(${scale})`",
  ].forEach((depthToken) => {
    assert.ok(combined.includes(depthToken), `depth scroll mapping should keep requested depth token: ${depthToken}`)
  })
  assert.ok(combined.includes(".depth-scroll-node.zhixing-node--current"), "depth nodes must prevent current-node animation from overriding transform")
  assert.ok(combined.includes("animation: none;"), "depth current nodes should keep inline 3D transforms")
  assert.equal(combined.includes('document.getElementById("verdict")?.scrollIntoView'), false, "verdict should stay inside the perspective scroll instead of hard jumping to a flat section")
  assert.ok(combined.includes("Math.round(nextProgress)"), "scroll should snap softly to the nearest node")
  assert.ok(combined.includes("}, 180)"), "snap delay should wait for the user to stop scrolling")
  assert.ok(combined.includes("ink-path-spine"), "the scroll should have a subtle ink path spine")
  assert.ok(combined.includes("C450 120"), "ink path spine should be a soft vertical S curve, not a straight timeline")
  assert.ok(combined.includes("ink-path-spine__completed-shadow"), "completed path should darken into the past")
  assert.ok(combined.includes("ink-path-spine__current-light"), "current node should slightly brighten the ink path")
  assert.ok(combined.includes("ink-path-spine__future-mist"), "future path should be covered by mist instead of becoming a timeline")
  assert.ok(combined.includes("ink-path-spine__thread"), "path should have sparse ink-gold thread, not a flowchart line")
  assert.ok(combined.includes("strokeDasharray=\"0.18 1\""), "current path light should be a short local segment")
  assert.ok(combined.includes("inkPathThreadDrift"), "path thread should move slowly like qi, not a static connector")
  assert.ok(combined.includes("zhixing-node-stack::before"), "node stack should use mist to hide the past path")
  assert.ok(combined.includes("zhixing-node-stack::after"), "node stack should use mist to hide the future path")
  assert.ok(combined.includes("overflow-x: clip"), "page should hide horizontal drift without creating a sticky-breaking scroll container")
  assert.ok(combined.includes("overflow-y: visible"), "page should let the perspective stage stick to the viewport")
})
