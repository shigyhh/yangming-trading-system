import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const typeUrl = new URL("./archiveTypes.ts", import.meta.url)
const engineUrl = new URL("./archiveEngine.ts", import.meta.url)
const pageUrl = new URL("../../app/mirror-archive/page.tsx", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"]

test("mirror archive loads local report growth review and heart proof records", async () => {
  const source = [
    await readFile(typeUrl, "utf8"),
    await readFile(engineUrl, "utf8"),
  ].join("\n")

  ;[
    "export interface ArchiveItem",
    "mirror_report",
    "growth_profile",
    "growth_record",
    "trade_review",
    "behavior_loop",
    "heart_proof",
    "one_thought_record",
    "retest",
    "loadOneThoughtRecords",
    "loadMirrorReport",
    "loadHeartProofs",
    "compareRiskRadarSnapshots",
    "ym_living_mirror_growth_v1",
    "tradeReviewLastResultStorageKey",
    "loadMirrorArchiveData",
    "buildLivingMirrorGrowthProfileFromLocal",
    "recomputeAndSaveGrowthProfile",
    "GrowthProfile",
    "ensureBehaviorLoopFromTradeReview",
    "ensureBehaviorLoopsFromHeartProofs",
    "loadBehaviorLoops",
    "toGrowthProfileArchiveItem",
    "toActiveGrowthProfileArchiveItem",
    "toBehaviorLoopArchiveItem",
    "toOneThoughtRecordArchiveItem",
    "nextCycleFocus",
    "repeatCount",
    "/living-mirror-growth",
    "toRetestArchiveItem",
    "detailHref",
    "已沉淀",
    "破环动作",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `mirror archive engine missing ${token}`)
  })
})

test("mirror archive page exposes Sprint 11 MVP sections", async () => {
  const source = await readFile(pageUrl, "utf8")

  ;[
    "心镜档案馆",
    "心镜档案馆 · 归档中心",
    "报告、心证、修行、复盘、复测，全部归档",
    "日课路线和真实复盘路线的证据都会留在这里",
    "心镜报告数量",
    "已训练天数",
    "心证数量",
    "一念记录数",
    "真实复盘数量",
    "循环识别数",
    "最近复测状态",
    "我的心镜报告",
    "我的活镜成长谱",
    "循环识别记录",
    "我的活镜成长",
    "我的真实复盘",
    "我的今日心证",
    "我的一念记录",
    "我的复测变化",
    "GrowthProfileArchiveCard",
    "BehaviorLoopArchiveCard",
    "RetestArchiveCard",
    "当前阶段",
    "已修行天数",
    "高频一念",
    "下一轮照见重点",
    "已识别循环数量",
    "底层循环识别",
    "最高风险循环",
    "破环动作",
    "是否已复测",
    "已改善维度",
    "可查、可读、可管理",
    "archive-insight-grid",
    "grid-template-columns: repeat(3, minmax(240px, 1fr))",
    "成长谱数量",
    "展开心镜长卷",
    "/mirror-scroll",
    "补真实复盘",
    "/trade-review",
    "绑定手机号后可长期保存心镜档案",
    "loadMirrorArchiveData",
    "LivingMirrorLoopDiagram",
    "ArchiveSection",
    "ArchiveRecordCard",
    "detailHref",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `mirror archive page missing ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `mirror archive contains forbidden phrase ${phrase}`)
  })
})
