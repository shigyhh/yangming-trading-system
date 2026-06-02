import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("../../app/cycle-mirror/page.tsx", import.meta.url)
const componentUrl = new URL("./CycleMirror.tsx", import.meta.url)
const engineUrl = new URL("./cycle-mirror-data.ts", import.meta.url)
const behaviorLoopStorageUrl = new URL("../living-mirror-growth/behaviorLoopStorage.ts", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶"]

test("cycle mirror reads behavior loops from storage and renders the loop evidence", async () => {
  const page = await readFile(pageUrl, "utf8")
  const component = await readFile(componentUrl, "utf8")
  const engine = await readFile(engineUrl, "utf8")
  const behaviorLoopStorage = await readFile(behaviorLoopStorageUrl, "utf8")
  const source = `${page}\n${component}\n${engine}\n${behaviorLoopStorage}`

  ;[
    "loadBehaviorLoops",
    "getBehaviorLoopsForUser",
    "recomputeAndSaveGrowthProfile",
    "BehaviorLoop",
    "循环之镜",
    "照见你为何反复在同一个地方失守。",
    "循环还未显影",
    "完成至少一次真实交易复盘，或连续记录同一念头后，系统会开始识别你的重复循环。",
    "去做真实交易复盘",
    "重复次数",
    "风险等级",
    "置信度",
    "影响维度",
    "首次出现",
    "最近出现",
    "破环动作",
    "loop.trigger",
    "loop.thought",
    "loop.action",
    "loop.result",
    "loop.selfStory",
    "loop.loopBreakAction",
    "loop.affectedDimensions",
    "loop.firstSeenAt",
    "loop.lastSeenAt",
    "本系统仅用于交易心理训练与行为复盘，不预测行情，不提供买卖建议，不构成任何投资建议。",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })

  ;["触发", "念头", "动作", "结果", "再次触发"].forEach((token) => {
    assert.equal(engine.includes(token), true, `missing loop node: ${token}`)
  })

  ;["群里都在说", "再不上车来不及了", "追涨", "被套", "更怕错过"].forEach((token) => {
    assert.equal(engine.includes(token), true, `missing real-cycle example token: ${token}`)
  })
})

test("cycle mirror data copy keeps compliance boundaries", async () => {
  const page = await readFile(pageUrl, "utf8")
  const component = await readFile(componentUrl, "utf8")
  const engine = await readFile(engineUrl, "utf8")
  const source = `${page}\n${component}\n${engine}`

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `contains forbidden phrase: ${phrase}`)
  })
})
