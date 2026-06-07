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
    "one_thought_record",
    "retest_change",
    "loadMirrorArchiveData",
    "loadHeartProofs",
    "loadOneThoughtRecords",
    "groupMirrorScrollByDate",
    "入照节点",
    "报告节点",
    "活镜成长节点",
    "活镜成长谱节点",
    "真实复盘节点",
    "循环识别节点",
    "今日心证节点",
    "每日一念节点",
    "复测变化节点",
    "活镜成长谱已生成",
    "循环识别显影",
    "复测变化已生成",
    "你的高频一念是",
    "你正在重复的循环是",
    "本轮改善",
    "下一轮重点",
    "toScrollNodes",
    "buildHeartProofNode",
    "buildOneThoughtRecordNode",
    "behaviorLoopCount",
    "oneThoughtRecordCount",
    "oneThoughtPool",
    "mirrors.json",
    "tradeMoment",
    "reflection",
    "mirrorName",
    "sceneName",
    "sealedAt",
    "isLatest",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `mirror scroll engine missing ${token}`)
  })
})

test("mirror scroll page exposes still-water long scroll narrative", async () => {
  const source = await readFile(pageUrl, "utf8")

  ;[
    "明镜止水 · 照见长卷",
    "心镜长卷",
    "不是记录你做过什么。",
    "而是记录你一次次看见了谁在下单。",
    "无善无恶心之体",
    "有善有恶意之动",
    "知善知恶是良知",
    "为善去恶是格物",
    "你已经照见",
    "其中，最常出现的是",
    "你不是没有变化",
    "长按这一念，让它沉入水底。",
    "知而不行，只是未知。",
    "今日这一念，已被你亲手放下。",
    "轻触水面，照回完整一念",
    "原来，我一直照的，是自己的心。",
    "明日再照。",
    "heart-river",
    "river-scroller",
    "river-station",
    "thought-stone",
    "water-impact",
    "thief-shadow",
    "echo-rings",
    "zhu-seal",
    "backlight-reflection",
    "长卷尚未展开",
    "只看心贼",
    "只看镜",
    "回到今日",
    "心镜档案馆",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `mirror scroll page missing ${token}`)
  })

  ;["scroll-paper", "scroll-node-card", "node-orb", "latest-seal", "hiddenThought"].forEach((token) => {
    assert.equal(source.includes(token), false, `mirror scroll page should not include old/list token ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `mirror scroll contains forbidden phrase ${phrase}`)
  })
})
