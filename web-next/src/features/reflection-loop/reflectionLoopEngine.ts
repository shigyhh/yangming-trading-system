import type { MirrorArchiveData } from "@/features/mirror-archive/archiveTypes"
import { buildLivingMirrorGrowthProfileFromLocal } from "@/features/living-mirror-growth/growthProfileStorage"

import type {
  LivingMirrorLoopInput,
  LivingMirrorLoopNode,
  LivingMirrorLoopNodeId,
  LivingMirrorLoopStatus,
  LivingMirrorLoopSummary,
} from "./reflectionLoopTypes"
import { livingMirrorLoopNodes, livingMirrorLoopSprintLabels } from "./livingMirrorLoopNodes"

export const livingMirrorLoopSteps: Array<Omit<LivingMirrorLoopNode, "status">> = livingMirrorLoopNodes.map((node) => {
  const sprintLabel = livingMirrorLoopSprintLabels[node.id]

  return {
    ...node,
    description: node.subtitle,
    sprintLabel,
    sprintDisplayLabel: `${node.title} · ${sprintLabel}`,
    artifactLabel: node.outputObject,
  }
})

export function getLivingMirrorLoopStatus(input: LivingMirrorLoopInput): LivingMirrorLoopNode[] {
  const normalized = normalizeLoopInput(input)
  const activeNodeId = getActiveLoopNodeId(normalized)

  return livingMirrorLoopSteps.map((step) => ({
    ...step,
    status: getLoopNodeStatus(step.id, activeNodeId, normalized),
  }))
}

export function getLivingMirrorLoopSummary(nodes: LivingMirrorLoopNode[]): LivingMirrorLoopSummary {
  const fallbackNode = nodes[nodes.length - 1] || {
    ...livingMirrorLoopSteps[livingMirrorLoopSteps.length - 1],
    status: "active" as const,
  }
  const activeNode = nodes.find((node) => node.status === "active") || fallbackNode
  const guidance = loopGuidanceByNodeId[activeNode.id]

  return {
    activeNode,
    doneCount: nodes.filter((node) => node.status === "done").length,
    lockedCount: nodes.filter((node) => node.status === "locked").length,
    totalCount: nodes.length,
    isClosed: activeNode.id === "next_enter_reflection",
    nextEvidenceText: guidance.nextEvidenceText,
    activeActionText: guidance.activeActionText,
  }
}

export function buildLivingMirrorLoopInputFromArchive(archiveData: MirrorArchiveData): LivingMirrorLoopInput {
  const { summary, sections } = archiveData
  const hasMirrorReport = summary.reportCount > 0
  const completedGrowthDays = summary.completedDays
  const hasTradeReview = summary.tradeReviewCount > 0
  const growthProfile = buildLivingMirrorGrowthProfileFromLocal()
  const hasHeartProof = summary.heartProofCount > 0 || sections.heartProofs.length > 0
  const hasBehaviorLoop = summary.behaviorLoopCount > 0 || sections.behaviorLoops.length > 0
  const hasDailyPractice = completedGrowthDays > 0 || sections.growthRecords.length > 0 || hasHeartProof
  const hasConscienceSeal = hasHeartProof
  const hasMirrorArchive = archiveData.allItems.length > 0
  const hasMirrorScroll = growthProfile.sourceSummary.evidenceCount > 0 || hasHeartProof || hasTradeReview || summary.growthProfileCount > 0

  return {
    hasAssessment: hasMirrorReport,
    hasPersonaResult: hasMirrorReport,
    hasMirrorReport,
    hasDailyThought: hasMirrorReport || hasHeartProof,
    hasReflectionBack: hasMirrorReport || hasHeartProof,
    hasHeartThief: hasMirrorReport || hasHeartProof,
    hasHeartProof,
    hasDailyPractice,
    hasConscienceSeal,
    hasMirrorArchive,
    hasMirrorScroll,
    completedGrowthDays,
    hasTradeReview,
    hasBehaviorLoop,
    hasRetest: summary.retestCount > 0 || sections.retests.length > 0,
  }
}

const loopGuidanceByNodeId: Record<
  LivingMirrorLoopNodeId,
  {
    nextEvidenceText: string
    activeActionText: string
  }
> = {
  enter_reflection: {
    nextEvidenceText: "生成 assessment_id，先留下第一次照见。",
    activeActionText: "进入入照心，记录交易场景里的第一念。",
  },
  daily_thought: {
    nextEvidenceText: "生成 daily_thought_id，让今天最先浮上的一念有来源。",
    activeActionText: "进入今日一念，从三十六场景里等到被戳中的那句。",
  },
  reflection_back: {
    nextEvidenceText: "生成 reflection_back_id，把这一念照回情绪、场景和反应。",
    activeActionText: "完成照回，不急着解释，只先看见反应从哪里起。",
  },
  heart_thief: {
    nextEvidenceText: "生成 heart_thief_id，让贪、急、惧、不甘等心贼显影。",
    activeActionText: "看见今天是谁在带走你，而不是给自己贴标签。",
  },
  mirror_manifestation: {
    nextEvidenceText: "生成 persona_result_id，把主副心镜显出来。",
    activeActionText: "让九镜给今天的心贼定名，显出主镜与副镜。",
  },
  heart_proof: {
    nextEvidenceText: "生成 heart_proof_id，把今天照见沉淀成一句“我看见”。",
    activeActionText: "写下今日心证，让一念从感受变成可回看的证据。",
  },
  daily_practice: {
    nextEvidenceText: "生成 daily_growth_id，留下今日签到、观念和落印。",
    activeActionText: "完成今日修行，让训练进度和心证同步更新。",
  },
  conscience_seal: {
    nextEvidenceText: "生成 daily_seal_id，把今日心证与修行动作落印为证。",
    activeActionText: "致良知落印，不是压住念头，而是看见它、放下它。",
  },
  mirror_report: {
    nextEvidenceText: "生成 mirror_report_id，沉淀当天照见总结与训练处方。",
    activeActionText: "先看今天这张心镜报告，再归入心镜档案馆。",
  },
  trade_review: {
    nextEvidenceText: "生成 trade_review_id，把真实交易复盘写入档案。",
    activeActionText: "拍照持仓，结合历史 K 线回看交易场景，只复盘当时是谁在下单。",
  },
  mirror_archive: {
    nextEvidenceText: "生成 mirror_archive_id，把报告、心证、修行、复盘、复测全部归档。",
    activeActionText: "进入心镜档案馆，先把证据收好，再展开成长叙事。",
  },
  mirror_scroll: {
    nextEvidenceText: "生成 mirror_scroll_id，把每日证据连成心镜长卷。",
    activeActionText: "展开长卷，看见 Day001 到 Day036 的变化故事。",
  },
  retest_change: {
    nextEvidenceText: "生成 retest_id，对比首测与复测的风险雷达。",
    activeActionText: "七日后复测，只证明行为是否变化。",
  },
  next_enter_reflection: {
    nextEvidenceText: "生成 next_assessment_id，带着变化进入下一轮照见。",
    activeActionText: "闭环已走完一轮，下一次入照心会带着新证据重新开始。",
  },
}

function getActiveLoopNodeId(input: LivingMirrorLoopInput): LivingMirrorLoopNodeId {
  if (!input.hasAssessment) return "enter_reflection"
  if (!input.hasDailyThought) return "daily_thought"
  if (!input.hasReflectionBack) return "reflection_back"
  if (!input.hasHeartThief) return "heart_thief"
  if (!input.hasPersonaResult) return "mirror_manifestation"
  if (!input.hasHeartProof) return "heart_proof"
  if (!input.hasDailyPractice) return "daily_practice"
  if (!input.hasConscienceSeal) return "conscience_seal"
  if (!input.hasMirrorReport) return "mirror_report"
  if (!input.hasTradeReview) return "trade_review"
  if (!input.hasMirrorArchive) return "mirror_archive"
  if (!input.hasMirrorScroll) return "mirror_scroll"
  if (!input.hasRetest) return "retest_change"

  return "next_enter_reflection"
}

function getLoopNodeStatus(
  nodeId: LivingMirrorLoopNodeId,
  activeNodeId: LivingMirrorLoopNodeId,
  input: LivingMirrorLoopInput,
): LivingMirrorLoopStatus {
  if (nodeId === activeNodeId) return "active"

  return isLoopNodeDone(nodeId, input) ? "done" : "locked"
}

function isLoopNodeDone(nodeId: LivingMirrorLoopNodeId, input: LivingMirrorLoopInput) {
  switch (nodeId) {
    case "enter_reflection":
      return input.hasAssessment
    case "daily_thought":
      return input.hasDailyThought
    case "reflection_back":
      return input.hasReflectionBack
    case "heart_thief":
      return input.hasHeartThief
    case "mirror_manifestation":
      return input.hasPersonaResult
    case "heart_proof":
      return input.hasHeartProof
    case "daily_practice":
      return input.hasDailyPractice
    case "conscience_seal":
      return input.hasConscienceSeal
    case "mirror_report":
      return input.hasMirrorReport
    case "trade_review":
      return input.hasTradeReview
    case "mirror_archive":
      return input.hasMirrorArchive
    case "mirror_scroll":
      return input.hasMirrorScroll
    case "retest_change":
      return input.hasRetest
    case "next_enter_reflection":
      return false
  }
}

function normalizeLoopInput(input: LivingMirrorLoopInput): LivingMirrorLoopInput {
  const hasRetest = input.hasRetest
  const hasMirrorScroll = input.hasMirrorScroll || hasRetest
  const hasMirrorArchive = input.hasMirrorArchive || hasMirrorScroll
  const hasTradeReview = input.hasTradeReview || hasRetest
  const hasMirrorReport = input.hasMirrorReport || hasTradeReview || input.completedGrowthDays > 0
  const hasConscienceSeal = input.hasConscienceSeal || hasMirrorReport
  const hasDailyPractice = input.hasDailyPractice || hasConscienceSeal
  const hasHeartProof = input.hasHeartProof || hasDailyPractice
  const hasPersonaResult = input.hasPersonaResult || hasHeartProof || hasMirrorReport
  const hasHeartThief = input.hasHeartThief || hasPersonaResult
  const hasReflectionBack = input.hasReflectionBack || hasHeartThief
  const hasDailyThought = input.hasDailyThought || hasReflectionBack
  const hasAssessment = input.hasAssessment || hasDailyThought

  return {
    ...input,
    hasAssessment,
    hasDailyThought,
    hasReflectionBack,
    hasHeartThief,
    hasPersonaResult,
    hasHeartProof,
    hasDailyPractice,
    hasConscienceSeal,
    hasMirrorReport,
    hasTradeReview,
    hasMirrorArchive,
    hasMirrorScroll,
    hasRetest,
    completedGrowthDays: Math.max(0, input.completedGrowthDays),
  }
}
