import type { MirrorArchiveData } from "@/features/mirror-archive/archiveTypes"
import { buildLivingMirrorGrowthProfileFromLocal } from "@/features/living-mirror-growth/growthProfileStorage"
import { loadShareCards } from "@/features/share-card/shareCardStorage"

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
  const shareCards = loadShareCards()
  const hasMirrorReport = summary.reportCount > 0
  const completedGrowthDays = summary.completedDays
  const hasTradeReview = summary.tradeReviewCount > 0
  const growthProfile = buildLivingMirrorGrowthProfileFromLocal()
  const hasGrowthProfile = hasTradeReview && growthProfile.sourceSummary.evidenceCount > 0 && (
    growthProfile.sourceSummary.heartProofCount > 0 ||
    growthProfile.sourceSummary.tradeReviewCount > 0 ||
    growthProfile.sourceSummary.behaviorLoopCount > 0 ||
    growthProfile.sourceSummary.retestChangeCount > 0
  )
  const hasBehaviorLoop = summary.behaviorLoopCount > 0 || sections.behaviorLoops.length > 0

  return {
    hasAssessment: hasMirrorReport,
    hasPersonaResult: hasMirrorReport,
    hasMirrorReport,
    completedGrowthDays,
    hasTradeReview,
    hasGrowthProfile,
    hasBehaviorLoop,
    hasRetest: summary.retestCount > 0 || sections.retests.length > 0,
    hasAssistantHandoff: false,
    hasShareOrGlobalReflection: shareCards.length > 0,
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
  mirror_manifestation: {
    nextEvidenceText: "生成 persona_result_id，把主副心镜显出来。",
    activeActionText: "完成九镜显影，让高危一念有名字。",
  },
  mirror_report: {
    nextEvidenceText: "生成 mirror_report_id，沉淀风险雷达与七日处方。",
    activeActionText: "保存心镜报告，作为后续训练和复测基线。",
  },
  daily_growth: {
    nextEvidenceText: "生成 daily_growth_id，留下今日签到、观念和落印。",
    activeActionText: "完成今日修行，让训练进度和心证同步更新。",
  },
  trade_review: {
    nextEvidenceText: "生成 trade_review_id，把真实交易复盘写入档案。",
    activeActionText: "不判断行情对错，只复盘当时是谁在下单。",
  },
  growth_profile: {
    nextEvidenceText: "生成 growth_profile_id，把心证、训练和复盘连成成长谱。",
    activeActionText: "把每日心证和复盘心证归入活镜成长谱。",
  },
  behavior_loop: {
    nextEvidenceText: "生成 behavior_loop_id，看见触发、一念、动作、结果的重复。",
    activeActionText: "进入循环之镜，把真实复盘转成自己的行为循环。",
  },
  retest_change: {
    nextEvidenceText: "生成 retest_id，对比首测与复测的风险雷达。",
    activeActionText: "七日后复测，只证明行为是否变化。",
  },
  assistant_handoff: {
    nextEvidenceText: "生成 assistant_handoff_id，把人格、风险、心证和下一步交给助教。",
    activeActionText: "形成助教承接摘要，避免只看手机号和标签。",
  },
  share_global: {
    nextEvidenceText: "生成 global_reflection_id，用匿名一念进入全球照见层。",
    activeActionText: "分享照见，不做低级裂变，不展示收益或买卖点。",
  },
  next_enter_reflection: {
    nextEvidenceText: "生成 next_assessment_id，带着变化进入下一轮照见。",
    activeActionText: "闭环已走完一轮，下一次入照心会带着新证据重新开始。",
  },
}

function getActiveLoopNodeId(input: LivingMirrorLoopInput): LivingMirrorLoopNodeId {
  if (!input.hasAssessment) return "enter_reflection"
  if (!input.hasPersonaResult) return "mirror_manifestation"
  if (!input.hasMirrorReport) return "mirror_report"
  if (input.hasMirrorReport && input.completedGrowthDays < 1) return "daily_growth"
  if (input.completedGrowthDays >= 1 && !input.hasTradeReview) return "trade_review"
  if (input.hasTradeReview && !input.hasGrowthProfile) return "growth_profile"
  if (input.hasGrowthProfile && !input.hasBehaviorLoop) return "behavior_loop"
  if (input.hasBehaviorLoop && input.completedGrowthDays < 7 && !input.hasRetest) return "daily_growth"
  if (input.completedGrowthDays >= 7 && !input.hasRetest) return "retest_change"
  if (input.hasRetest && !input.hasAssistantHandoff) return "assistant_handoff"
  if (input.hasAssistantHandoff && !input.hasShareOrGlobalReflection) return "share_global"

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
    case "mirror_manifestation":
      return input.hasPersonaResult
    case "mirror_report":
      return input.hasMirrorReport
    case "daily_growth":
      return input.completedGrowthDays >= 1
    case "trade_review":
      return input.hasTradeReview
    case "growth_profile":
      return input.hasGrowthProfile
    case "behavior_loop":
      return input.hasBehaviorLoop
    case "retest_change":
      return input.hasRetest
    case "assistant_handoff":
      return input.hasAssistantHandoff
    case "share_global":
      return input.hasShareOrGlobalReflection
    case "next_enter_reflection":
      return false
  }
}

function normalizeLoopInput(input: LivingMirrorLoopInput): LivingMirrorLoopInput {
  const hasShareOrGlobalReflection = input.hasShareOrGlobalReflection
  const hasAssistantHandoff = input.hasAssistantHandoff || hasShareOrGlobalReflection
  const hasRetest = input.hasRetest || hasAssistantHandoff
  const hasBehaviorLoop = input.hasBehaviorLoop || hasRetest
  const hasGrowthProfile = input.hasGrowthProfile || hasBehaviorLoop
  const hasTradeReview = input.hasTradeReview || hasBehaviorLoop
  const hasMirrorReport = input.hasMirrorReport || input.completedGrowthDays > 0 || hasTradeReview
  const hasPersonaResult = input.hasPersonaResult || hasMirrorReport
  const hasAssessment = input.hasAssessment || hasPersonaResult

  return {
    ...input,
    hasAssessment,
    hasPersonaResult,
    hasMirrorReport,
    hasTradeReview,
    hasGrowthProfile,
    hasBehaviorLoop,
    hasRetest,
    hasAssistantHandoff,
    hasShareOrGlobalReflection,
    completedGrowthDays: Math.max(0, input.completedGrowthDays),
  }
}
