import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("./ZhixingScrollHome.tsx", import.meta.url)
const definitionsUrl = new URL("./zhixingScrollDefinitions.ts", import.meta.url)
const storeUrl = new URL("./zhixingScrollStore.ts", import.meta.url)
const routeUrl = new URL("../../app/zhixing-scroll/page.tsx", import.meta.url)
const topNavUrl = new URL("../../components/home/top-nav.tsx", import.meta.url)

test("zhixing scroll keeps the daily practice loop as the primary route", async () => {
  const page = await readFile(pageUrl, "utf8")
  const definitions = await readFile(definitionsUrl, "utf8")
  const store = await readFile(storeUrl, "utf8")
  const route = await readFile(routeUrl, "utf8")
  const topNav = await readFile(topNavUrl, "utf8")

  assert.ok(route.includes("ZhixingScrollHome"), "route must mount the new zhixing scroll home")
  assert.ok(topNav.includes('href: "/zhixing-scroll"'), "home top nav must expose zhixing scroll")
  assert.ok(topNav.includes('href="/zhixing-scroll"'), "mobile bottom nav must expose zhixing scroll")

  ;[
    "交易前，先展开一卷。",
    "市场未动，心已先动。",
    "一念不照，万法皆乱。",
    "开始今日一卷",
  ].forEach((copy) => {
    assert.ok(page.includes(copy), `missing first-screen copy: ${copy}`)
  })

  ;[
    "enter-heart",
    "today-thought",
    "heart-thief",
    "nine-mirror",
    "daily-evidence",
    "daily-practice",
    "liangzhi-seal",
    "daily-verdict",
    "heart-archive",
    "hundred-day-scroll",
  ].forEach((nodeId) => {
    assert.ok(definitions.includes(`id: "${nodeId}"`), `missing zhixing node: ${nodeId}`)
  })

  assert.ok(definitions.indexOf('id: "enter-heart"') < definitions.indexOf('id: "today-thought"'))
  assert.ok(definitions.indexOf('id: "today-thought"') < definitions.indexOf('id: "heart-thief"'))
  assert.ok(definitions.indexOf('id: "heart-thief"') < definitions.indexOf('id: "nine-mirror"'))
  assert.ok(definitions.indexOf('id: "daily-practice"') < definitions.indexOf('id: "liangzhi-seal"'))
  assert.ok(definitions.indexOf('id: "liangzhi-seal"') < definitions.indexOf('id: "daily-verdict"'))

  ;["贪镜", "惧镜", "急镜", "悔镜", "赌镜", "扛镜", "乱镜", "疑镜", "慢镜"].forEach((mirrorName) => {
    assert.ok(definitions.includes(`name: "${mirrorName}"`), `missing mirror definition: ${mirrorName}`)
  })

  ;["不追印", "不扛印", "轻仓印", "等待印", "止损印", "复盘印", "休市印", "认错印", "减频印", "守规印", "静观印", "知行印"].forEach((sealName) => {
    assert.ok(definitions.includes(`name: "${sealName}"`), `missing seal definition: ${sealName}`)
  })

  assert.ok(store.includes("ym_zhixing_daily_scroll_v1"), "daily scroll must persist with a dedicated storage key")
  assert.ok(store.includes("completeZhixingNode"), "daily scroll must expose a completion state transition")
  assert.ok(store.includes("buildDailyVerdict"), "state transition must generate the daily verdict")
  assert.ok(page.includes("LiveDemoMode"), "first phase should keep the live demo mode visible")
  assert.ok(page.includes("小程序码 / 课程入口"), "live demo should reserve a mini-program/course slot")
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
    "scrollLeft",
  ].forEach((forbidden) => {
    assert.equal(combined.includes(forbidden), false, `forbidden phrase or mechanic leaked into zhixing scroll: ${forbidden}`)
  })

  assert.ok(combined.includes("#050807"), "visual system should preserve the deep ink direction")
  assert.ok(combined.includes("当前节点如灯") || combined.includes("zhixing-node--current"), "current node should be visually emphasized")
  assert.ok(combined.includes("zhixing-mist"), "visual system must include ink mist")
  assert.ok(combined.includes("zhixing-dust"), "visual system must include restrained golden dust")
  assert.ok(combined.includes("zhixing-node-stack::before"), "node stack should use mist to hide the past path")
  assert.ok(combined.includes("zhixing-node-stack::after"), "node stack should use mist to hide the future path")
  assert.ok(combined.includes("overflow-x: hidden"), "page should hide horizontal drift without clipping the vertical long scroll")
})
