import { loadHeartProofs } from "@/features/heart-proof/heartProofStorage"
import type { HeartProof } from "@/features/heart-proof/heartProofTypes"
import { loadGrowthProfileScrollEvents } from "@/features/living-mirror-growth/growthProfileStorage"
import { loadMirrorArchiveData } from "@/features/mirror-archive/archiveEngine"
import type { ArchiveItem } from "@/features/mirror-archive/archiveTypes"

import type { MirrorScrollData, MirrorScrollDayGroup, MirrorScrollNode, MirrorScrollNodeType } from "./scrollTypes"

const nodeLabels: Record<MirrorScrollNodeType, string> = {
  entry: "入照节点",
  report: "报告节点",
  growth: "活镜成长节点",
  growth_profile: "活镜成长谱节点",
  trade_review: "真实复盘节点",
  behavior_loop: "循环之镜节点",
  heart_proof: "今日心证节点",
  retest: "复测变化节点",
  retest_change: "复测变化节点",
}

export function loadMirrorScrollData(): MirrorScrollData {
  const archive = loadMirrorArchiveData()
  const heartProofs = loadHeartProofs()
  const heartProofById = new Map(heartProofs.map((proof) => [proof.heartProofId, proof]))
  const nodes = dedupeScrollNodes([
    ...archive.allItems.flatMap((item) => toScrollNodes(item, heartProofById)),
    ...loadGrowthProfileScrollEvents(),
  ])
  const sortedNodes = nodes.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
  const latestNode = sortedNodes.at(-1)
  const markedNodes = sortedNodes.map((node) => ({
    ...node,
    isLatest: node.id === latestNode?.id,
  }))
  const groups = groupMirrorScrollByDate(markedNodes)

  return {
    summary: {
      dayCount: groups.length,
      nodeCount: markedNodes.length,
      heartProofCount: heartProofs.length,
      tradeReviewCount: archive.sections.tradeReviews.length,
      behaviorLoopCount: archive.sections.behaviorLoops.length,
      retestCount: archive.sections.retests.length,
    },
    groups,
    latestNodeId: latestNode?.id,
  }
}

function dedupeScrollNodes(nodes: MirrorScrollNode[]) {
  return Array.from(new Map(nodes.map((node) => [node.id, node])).values())
}

export function groupMirrorScrollByDate(nodes: MirrorScrollNode[]): MirrorScrollDayGroup[] {
  const groupMap = new Map<string, MirrorScrollNode[]>()

  nodes.forEach((node) => {
    const dateKey = toDateKey(node.createdAt)
    groupMap.set(dateKey, [...(groupMap.get(dateKey) || []), node])
  })

  return Array.from(groupMap.entries()).map(([dateKey, dayNodes]) => ({
    dateKey,
    dateLabel: formatScrollDate(dateKey),
    nodes: dayNodes,
  }))
}

function toScrollNodes(item: ArchiveItem, heartProofById: Map<string, HeartProof>): MirrorScrollNode[] {
  if (item.type === "mirror_report") {
    return [
      buildNode(item, "entry", {
        id: `scroll_entry_${item.sourceId}`,
        title: "第一次入照心",
        thoughtText: "第一次照见交易中的自己",
        actionText: "完成入照心仪式，留下心镜报告入口。",
        proofText: "用户不是完成一次测评，而是开启一份活镜档案。",
        affectedDimensions: ["入照心", "心镜报告"],
      }),
      buildNode(item, "report", {
        id: `scroll_report_${item.sourceId}`,
        title: item.title,
        thoughtText: item.tags[0] || "主镜待照见",
        actionText: "保存心镜报告，进入七日训练处方。",
        proofText: item.summary,
        affectedDimensions: item.tags,
      }),
    ]
  }

  if (item.type === "heart_proof") {
    const proof = heartProofById.get(item.sourceId)
    return [buildHeartProofNode(item, proof)]
  }

  if (item.type === "trade_review") {
    return [
      buildNode(item, "trade_review", {
        id: `scroll_trade_review_${item.sourceId}`,
        title: "复盘节点",
        thoughtText: item.tags[1] || item.tags[0] || "当时的一念",
        actionText: "不复盘行情对错，只复盘当时是谁在下单。",
        proofText: item.summary,
        affectedDimensions: item.tags,
      }),
    ]
  }

  if (item.type === "growth_profile") {
    return [
      buildNode(item, "growth_profile", {
        id: `scroll_growth_profile_${item.sourceId}`,
        title: "活镜成长谱已生成",
        thoughtText: item.tags[1] || "待照见",
        actionText: "把每日修行、心证、复盘和复测连成一份可读成长谱。",
        proofText: item.summary || `你的高频一念是 ${item.tags[1] || "待照见"}，当前处于 ${item.tags[0] || "待沉淀"}。`,
        affectedDimensions: item.tags,
      }),
    ]
  }

  if (item.type === "behavior_loop") {
    return [
      buildNode(item, "behavior_loop", {
        id: `scroll_behavior_loop_${item.sourceId}`,
        title: "循环之镜显影",
        thoughtText: item.tags[1] || "重复一念",
        actionText: "照见触发、一念、动作、结果如何反复出现。",
        proofText: item.summary || `你正在重复的循环是：${item.tags[0] || "触发待照见"} → ${item.tags[1] || "一念待照见"} → 行为待复盘。`,
        affectedDimensions: item.tags,
      }),
    ]
  }

  if (item.type === "growth_record") {
    return [
      buildNode(item, "growth", {
        id: `scroll_growth_${item.sourceId}`,
        title: item.title,
        thoughtText: item.tags[1] || "今日一念",
        actionText: "签到、观念、落印，更新训练证据。",
        proofText: item.summary,
        affectedDimensions: item.tags,
      }),
    ]
  }

  if (item.type === "retest") {
    return [
      buildNode(item, "retest_change", {
        id: `scroll_retest_${item.sourceId}`,
        title: "复测变化已生成",
        thoughtText: "复测变化",
        actionText: "对照首测与复测，观察风险雷达差异，进入下一轮重点。",
        proofText: item.summary || `本轮改善：${item.tags.slice(1).join("、") || "待继续验证"}。下一轮重点：继续照见。`,
        affectedDimensions: item.tags,
      }),
    ]
  }

  return []
}

function buildHeartProofNode(item: ArchiveItem, proof?: HeartProof): MirrorScrollNode {
  return buildNode(item, "heart_proof", {
    id: `scroll_heart_proof_${item.sourceId}`,
    title: proof?.sourceType === "trade_review" ? "复盘心证" : "今日心证",
    thoughtText: proof?.thoughtLabel || item.tags[0] || "今日一念",
    actionText: proof?.nextActionText || "下一次同场景，先看见念头再行动。",
    proofText: proof?.proofText || item.summary,
    affectedDimensions: proof?.affectedDimensions?.length ? proof.affectedDimensions : item.tags,
  })
}

function buildNode(
  item: ArchiveItem,
  type: MirrorScrollNodeType,
  override: {
    id: string
    title: string
    thoughtText: string
    actionText: string
    proofText: string
    affectedDimensions: string[]
  },
): MirrorScrollNode {
  return {
    id: override.id,
    type,
    nodeLabel: nodeLabels[type],
    sourceId: item.sourceId,
    detailHref: item.detailHref,
    title: override.title,
    summary: item.summary,
    thoughtText: override.thoughtText,
    actionText: override.actionText,
    proofText: override.proofText,
    affectedDimensions: Array.from(new Set(override.affectedDimensions)).filter(Boolean).slice(0, 6),
    tags: item.tags,
    createdAt: item.createdAt,
  }
}

function toDateKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "date-unknown"

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function formatScrollDate(dateKey: string) {
  if (dateKey === "date-unknown") return "时间待确认"
  const [year, month, day] = dateKey.split("-")
  return `${year}年${month}月${day}日`
}
