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
    "九镜显影",
    "显出主副人格与高危一念",
    "心镜报告",
    "生成风险雷达与七日处方",
    "今日修行",
    "签到、观念、落印",
    "真实交易复盘",
    "不复盘行情对错，只复盘谁在下单",
    "活镜成长谱",
    "把每日心证连成变化图谱",
    "循环之镜",
    "照见触发、一念、行为、结果的重复循环",
    "复测变化",
    "对比首测与复测，证明行为是否改变",
    "助教承接",
    "把人格、风险、心证与下一步交给助教",
    "分享 / 全球照见层",
    "分享照见，匿名映照全球交易者的一念",
    "下一次入照心",
    "带着变化进入下一轮照见",
    "以交易照人心",
    "以复盘照行为",
    "以训练照变化",
    "以活镜照成长",
    "assessment_id",
    "persona_result_id",
    "mirror_report_id",
    "daily_growth_id",
    "trade_review_id",
    "growth_profile_id",
    "behavior_loop_id",
    "retest_id",
    "assistant_handoff_id",
    "global_reflection_id",
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
    "if (!input.hasPersonaResult) return \"mirror_manifestation\"",
    "if (!input.hasMirrorReport) return \"mirror_report\"",
    "if (input.hasMirrorReport && input.completedGrowthDays < 1) return \"daily_growth\"",
    "if (input.completedGrowthDays >= 1 && !input.hasTradeReview) return \"trade_review\"",
    "if (input.hasTradeReview && !input.hasGrowthProfile) return \"growth_profile\"",
    "if (input.hasGrowthProfile && !input.hasBehaviorLoop) return \"behavior_loop\"",
    "if (input.completedGrowthDays >= 7 && !input.hasRetest) return \"retest_change\"",
    "if (input.hasRetest && !input.hasAssistantHandoff) return \"assistant_handoff\"",
    "if (input.hasAssistantHandoff && !input.hasShareOrGlobalReflection) return \"share_global\"",
    "return \"next_enter_reflection\"",
    "const growthProfile = buildLivingMirrorGrowthProfileFromLocal()",
    "growthProfile.sourceSummary.evidenceCount > 0",
    "growthProfile.sourceSummary.heartProofCount > 0",
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
