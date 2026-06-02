import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const typeUrl = new URL("./scrollTypes.ts", import.meta.url)
const engineUrl = new URL("./scrollEngine.ts", import.meta.url)
const pageUrl = new URL("../../app/mirror-scroll/page.tsx", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"]

test("mirror scroll builds narrative nodes from archive items and heart proofs", async () => {
  const source = [
    await readFile(typeUrl, "utf8"),
    await readFile(engineUrl, "utf8"),
  ].join("\n")

  ;[
    "export interface MirrorScrollNode",
    "export interface MirrorScrollDayGroup",
    "growth_profile",
    "retest_change",
    "loadMirrorArchiveData",
    "loadHeartProofs",
    "groupMirrorScrollByDate",
    "入照节点",
    "报告节点",
    "活镜成长节点",
    "活镜成长谱节点",
    "真实复盘节点",
    "循环之镜节点",
    "今日心证节点",
    "复测变化节点",
    "活镜成长谱已生成",
    "循环之镜显影",
    "复测变化已生成",
    "你的高频一念是",
    "你正在重复的循环是",
    "本轮改善",
    "下一轮重点",
    "toScrollNodes",
    "buildHeartProofNode",
    "behaviorLoopCount",
    "isLatest",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `mirror scroll engine missing ${token}`)
  })
})

test("mirror scroll page exposes Sprint 11.5 long scroll narrative", async () => {
  const source = await readFile(pageUrl, "utf8")

  ;[
    "心镜长卷",
    "把每天的一念，连成一卷。",
    "档案馆保存结构，长卷展开叙事",
    "scroll-paper",
    "scroll-node-card",
    "node-orb",
    "latest-seal",
    "当日一念",
    "当日动作",
    "当日心证",
    "影响维度",
    "node.summary",
    "line-clamp-3",
    "长卷未起笔",
    "回到心镜档案馆",
    "真实交易复盘",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `mirror scroll page missing ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `mirror scroll contains forbidden phrase ${phrase}`)
  })
})
