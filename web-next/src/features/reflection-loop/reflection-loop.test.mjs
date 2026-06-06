import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const engineUrl = new URL("./reflectionLoopEngine.ts", import.meta.url)
const typeUrl = new URL("./reflectionLoopTypes.ts", import.meta.url)
const dataUrl = new URL("./livingMirrorLoopNodes.ts", import.meta.url)
const componentUrl = new URL("./LivingMirrorLoopDiagram.tsx", import.meta.url)
const archivePageUrl = new URL("../../app/mirror-archive/page.tsx", import.meta.url)

test("living mirror loop exposes ordered nodes and status function", async () => {
  const source = [
    await readFile(typeUrl, "utf8"),
    await readFile(engineUrl, "utf8"),
    await readFile(dataUrl, "utf8"),
  ].join("\n")

  ;[
    "export interface LoopNode",
    "getLivingMirrorLoopStatus",
    "getLivingMirrorLoopSummary",
    "LivingMirrorLoopInput",
    "LivingMirrorLoopNode",
    "LivingMirrorLoopSummary",
    "LivingMirrorLoopPrinciple",
    "done",
    "active",
    "locked",
    "入照心",
    "第一次照见交易中的自己",
    "今日一念",
    "从三十六场景里浮现当天最先带走你的那一念",
    "照回",
    "把这一念照回情绪、场景与反应",
    "心贼显影",
    "照见贪、急、惧、不甘等当日心贼",
    "九镜显影",
    "把心贼归入今日主镜与副镜",
    "今日心证",
    "沉淀一句“我看见……”",
    "今日修行",
    "把心证落成一个可执行动作",
    "致良知落印",
    "把今日心证与修行动作落印为证",
    "今日照见总结",
    "生成当天心镜报告",
    "真实交易复盘",
    "拍照持仓，结合历史 K 线回看交易场景与临场反应",
    "心镜档案馆",
    "报告、心证、修行、复盘、复测，全部归档",
    "心镜长卷",
    "把每日证据连成成长叙事",
    "复测变化",
    "对比首测与复测，证明行为是否改变",
    "下一次入照心",
    "带着变化进入下一轮照见",
    "以交易照人心",
    "以复盘照行为",
    "以训练照变化",
    "以活镜照成长",
    "assessment_id",
    "daily_thought_id",
    "reflection_back_id",
    "heart_thief_id",
    "persona_result_id",
    "heart_proof_id",
    "daily_seal_id",
    "mirror_report_id",
    "daily_growth_id",
    "trade_review_id",
    "mirror_archive_id",
    "mirror_scroll_id",
    "retest_id",
    "next_assessment_id",
    "sprintLabel",
    "sprintDisplayLabel",
    "artifactLabel",
    "Sprint 8",
    "Sprint 10.5",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })
})

test("living mirror loop implements active node rules", async () => {
  const engine = await readFile(engineUrl, "utf8")

  ;[
    "if (!input.hasAssessment) return \"enter_reflection\"",
    "if (!input.hasDailyThought) return \"daily_thought\"",
    "if (!input.hasReflectionBack) return \"reflection_back\"",
    "if (!input.hasHeartThief) return \"heart_thief\"",
    "if (!input.hasPersonaResult) return \"mirror_manifestation\"",
    "if (!input.hasHeartProof) return \"heart_proof\"",
    "if (!input.hasDailyPractice) return \"daily_practice\"",
    "if (!input.hasConscienceSeal) return \"conscience_seal\"",
    "if (!input.hasMirrorReport) return \"mirror_report\"",
    "if (!input.hasTradeReview) return \"trade_review\"",
    "if (!input.hasMirrorArchive) return \"mirror_archive\"",
    "if (!input.hasMirrorScroll) return \"mirror_scroll\"",
    "if (!input.hasRetest) return \"retest_change\"",
    "return \"next_enter_reflection\"",
    "const growthProfile = buildLivingMirrorGrowthProfileFromLocal()",
    "growthProfile.sourceSummary.evidenceCount > 0",
    "const hasBehaviorLoop = summary.behaviorLoopCount > 0 || sections.behaviorLoops.length > 0",
  ].forEach((token) => {
    assert.equal(engine.includes(token), true, `missing active rule: ${token}`)
  })
})

test("living mirror loop diagram renders closed loop without blocking locked nodes", async () => {
  const component = await readFile(componentUrl, "utf8")
  const engine = await readFile(engineUrl, "utf8")
  const archivePage = await readFile(archivePageUrl, "utf8")
  const source = `${component}\n${engine}\n${archivePage}`

  ;[
    "LivingMirrorLoopDiagram",
    "buildLivingMirrorLoopInputFromArchive",
    "getLivingMirrorLoopStatus",
    "loop-node-card-done",
    "loop-node-card-active",
    "loop-node-card-locked",
    "loop-ring-stage",
    "loop-ring-orbit",
    "loop-mobile-track",
    "loop-return-arrow",
    "loop-card-arrow",
    "loop-node-sprint",
    "loop-evidence-bridge",
    "loop-engineering-map",
    "《照见》活镜闭环",
    "从一念入照，到行为复盘，再到变化证明。",
    "闭环证据",
    "下一枚证据",
    "内部研发节奏",
    "对用户展示闭环，对团队保留 Sprint",
    "产出对象",
    "所属原则",
    "回到 01 入照心",
    "本系统仅用于交易心理训练与行为复盘，不预测行情，不提供买卖建议，不构成任何投资建议。",
    "当前节点",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing loop diagram token: ${token}`)
  })
})
