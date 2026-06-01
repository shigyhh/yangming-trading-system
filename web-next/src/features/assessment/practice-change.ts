import type { BehaviorMirrorId } from "./behavior-mirrors"
import type { AssessmentReport } from "./report"

export type PracticeMetricKey =
  | "emptyAnxiety"
  | "chaseImpulse"
  | "stopLossExecution"
  | "planChange"
  | "zhixing"

export type PracticeMetric = {
  key: PracticeMetricKey
  label: string
  before: number
  current: number
  direction: "down" | "up"
}

export type PracticeRecordStatus = "completed" | "missed"
export type PracticeCheckInStatus = "preparing_trade" | "observe_only" | "already_traded"

export type KLineTrainingRecord = {
  sceneKey?: string
  reactionKey?: string
  scene: string
  reaction: string
  disciplineAction: string
  feedback?: string
}

export type DailyPracticeEntry = {
  checkIn: PracticeCheckInStatus
  cultivationText: string
  klineRecord?: KLineTrainingRecord
}

export type PracticeRiskRadarSnapshot = {
  createdAt: string
  primaryType: string
  secondaryType: string
  riskRadar: Array<{ key: string; label: string; value: number }>
}

export type PracticeRadarComparison = {
  key: string
  label: string
  before: number
  after: number
  delta: number
}

export type PracticeChangeState = {
  startedAt: string
  sourceMirrorId?: BehaviorMirrorId
  day: number
  lastRecordedDate?: string
  baselineReport?: PracticeRiskRadarSnapshot
  retestReport?: PracticeRiskRadarSnapshot
  metrics: PracticeMetric[]
  records: Array<{
    day: number
    dateKey?: string
    title: string
    note: string
    actions?: string[]
    status?: PracticeRecordStatus
    recordedAt?: string
    checkIn?: PracticeCheckInStatus
    cultivationText?: string
    klineRecord?: KLineTrainingRecord
  }>
}

type PracticeDay = {
  title: string
  note: string
  actions?: string[]
}

const dayPractices: PracticeDay[] = [
  {
    title: "停十秒",
    note: "今日只练一件事：下单前，先看见那一念。",
    actions: ["写下今天最容易冲动的一种情境。", "下单前停十秒，问它是否在计划内。", "收盘后记录：我有没有被第一念带走？"],
  },
  {
    title: "记一念",
    note: "今日只练一件事：记录最想冲进去的瞬间。",
    actions: ["盘中只捕捉一个最强念头。", "写下当时想做的动作。", "收盘后给它命名：贪、惧、急、疑、痴、慢。"],
  },
  {
    title: "守空仓",
    note: "今日只练一件事：没有条件，就允许自己不出手。",
    actions: ["开盘前写下可以空仓的理由。", "盘中没有触发条件时，不临时找机会。", "收盘后记录：我有没有把空仓看成落后？"],
  },
  {
    title: "止损不解释",
    note: "今日只练一件事：规则触发，不与自己辩论。",
    actions: ["开盘前写下失效条件。", "条件触发时，只执行，不补理由。", "收盘后记录：我有没有和亏损谈判？"],
  },
  {
    title: "盈利不证明",
    note: "今日只练一件事：有浮盈时，不急着证明自己。",
    actions: ["开盘前写下持仓规则。", "浮盈出现后，先看规则再看账户。", "收盘后记录：我有没有为了证明自己而加动作？"],
  },
  {
    title: "省察一念",
    note: "今日只练一件事：只看今天最明显的偏差。",
    actions: ["收盘后选一笔最不舒服的交易。", "写下当时第一句念头。", "把它归入一面行为镜。"],
  },
  {
    title: "复看心证",
    note: "今日只练一件事：看见七天后，自己是否更早觉察。",
    actions: ["复看第一天的念头。", "写下今天同类情境下的反应。", "判断自己是否比七天前更早停住。"],
  },
]

const mirrorFirstPractices: Record<BehaviorMirrorId, PracticeDay> = {
  chasing: {
    title: "追涨前停十秒",
    note: "今日只练一件事：计划外拉升，不临时追入。",
    actions: ["开盘前写下今天允许参与的条件。", "盘中看到快速拉升，先停十秒再看计划。", "收盘后记录：我有没有因为怕错过而追进去？"],
  },
  holdingLoss: {
    title: "失效不解释",
    note: "今日只练一件事：止损条件出现，不把希望当判断。",
    actions: ["开盘前写下这笔交易的失效条件。", "价格触发失效时，只执行，不补故事。", "收盘后记录：我有没有和亏损谈判？"],
  },
  fantasy: {
    title: "走势变了不补故事",
    note: "今日只练一件事：走势失效后，不用幻想替代规则。",
    actions: ["开盘前写下判断失效的信号。", "盘中一旦信号出现，先停止给行情找理由。", "收盘后记录：我有没有等市场证明我没错？"],
  },
  gambling: {
    title: "亏后一笔先停",
    note: "今日只练一件事：亏损之后，不立刻用下一笔翻本。",
    actions: ["开盘前写下连续亏损后的暂停规则。", "亏损离场后，至少暂停一轮观察。", "收盘后记录：我有没有用下一笔逃避上一笔？"],
  },
  following: {
    title: "外声先放下",
    note: "今日只练一件事：别人说什么，先不替你下单。",
    actions: ["开盘前写下自己的入场条件。", "听到外界观点后，先对照条件，不直接行动。", "收盘后记录：我有没有把主见交给别人？"],
  },
  hesitation: {
    title: "只验一条就行动",
    note: "今日只练一件事：关键条件满足，就不继续求保证。",
    actions: ["开盘前写下唯一最关键的确认条件。", "机会靠近时，只验证这一条。", "收盘后记录：我有没有因为怕错而错过计划内机会？"],
  },
  procrastination: {
    title: "收盘只记一错",
    note: "今日只练一件事：复盘不求完整，只面对一个偏差。",
    actions: ["收盘后只选一笔最偏离规则的交易。", "写下当时第一句借口。", "记录明天同类情境只改哪一个动作。"],
  },
  anxiety: {
    title: "浮盈守规则",
    note: "今日只练一件事：浮盈未破规则，不提前离场。",
    actions: ["开盘前写下止盈/持仓规则。", "盘中只看规则，不看情绪。", "收盘后记录：我有没有因为害怕回吐提前卖？"],
  },
  conscience: {
    title: "看见再行动",
    note: "今日只练一件事：情绪仍会起，但手先回到规则。",
    actions: ["开盘前写下今天最要守住的一条规则。", "情绪起来时，先停三秒说出它的名字。", "收盘后记录：我有没有看见情绪后仍按规则行动？"],
  },
}

function getDayPractices(sourceMirrorId?: BehaviorMirrorId) {
  if (!sourceMirrorId) return dayPractices

  return [
    mirrorFirstPractices[sourceMirrorId],
    ...dayPractices.slice(1),
  ]
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function riskValue(report: AssessmentReport, key: string) {
  return report.riskRadar.find((item) => item.key === key)?.value ?? 40
}

function metricProgress(before: number, direction: PracticeMetric["direction"], completedDays: number) {
  const ratio = Math.min(Math.max(completedDays, 0), 7) / 7
  const change = Math.round(18 * ratio)
  return direction === "down" ? clampScore(before - change) : clampScore(before + change)
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function completedRecordCount(records: PracticeChangeState["records"]) {
  return records.filter((record) => (record.status ?? "completed") === "completed").length
}

function reportSnapshot(report: AssessmentReport): PracticeRiskRadarSnapshot {
  return {
    createdAt: report.createdAt,
    primaryType: report.primaryType.label,
    secondaryType: report.secondaryType.label,
    riskRadar: report.riskRadar.map((item) => ({
      key: item.key,
      label: item.label,
      value: clampScore(item.value),
    })),
  }
}

export function createPracticeChange(report: AssessmentReport): PracticeChangeState {
  const impulse = riskValue(report, "impulse")
  const holding = riskValue(report, "holding")
  const proving = riskValue(report, "proving")
  const hesitation = riskValue(report, "hesitation")
  const observerScore = report.scores.disciplined_observer ?? 0

  const metrics: PracticeMetric[] = [
    {
      key: "emptyAnxiety",
      label: "空仓焦虑",
      before: clampScore((impulse + hesitation) / 2),
      current: clampScore((impulse + hesitation) / 2),
      direction: "down",
    },
    {
      key: "chaseImpulse",
      label: "追涨冲动",
      before: clampScore(impulse),
      current: clampScore(impulse),
      direction: "down",
    },
    {
      key: "stopLossExecution",
      label: "止损执行",
      before: clampScore(100 - (holding + proving) / 2),
      current: clampScore(100 - (holding + proving) / 2),
      direction: "up",
    },
    {
      key: "planChange",
      label: "临盘改计划",
      before: clampScore((proving + hesitation) / 2),
      current: clampScore((proving + hesitation) / 2),
      direction: "down",
    },
    {
      key: "zhixing",
      label: "知行合一",
      before: clampScore(42 + observerScore * 8),
      current: clampScore(42 + observerScore * 8),
      direction: "up",
    },
  ]

  return {
    startedAt: new Date().toISOString(),
    sourceMirrorId: report.sourceMirror?.id,
    day: 0,
    lastRecordedDate: undefined,
    baselineReport: reportSnapshot(report),
    retestReport: undefined,
    metrics,
    records: [],
  }
}

export function reconcilePracticeChangeWithReport(
  state: PracticeChangeState,
  report: AssessmentReport,
): PracticeChangeState {
  const snapshot = reportSnapshot(report)
  const baselineReport = state.baselineReport ?? snapshot
  const isNewReport = snapshot.createdAt !== baselineReport.createdAt
  const retestReport = isNewReport ? snapshot : state.retestReport

  return {
    ...state,
    sourceMirrorId: state.sourceMirrorId ?? report.sourceMirror?.id,
    baselineReport,
    retestReport,
  }
}

export function canRecordPracticeToday(state: PracticeChangeState) {
  return state.day < 7 && state.lastRecordedDate !== todayKey()
}

export function advancePracticeChange(
  state: PracticeChangeState,
  status: PracticeRecordStatus = "completed",
  entry?: DailyPracticeEntry,
): PracticeChangeState {
  if (!canRecordPracticeToday(state)) return state

  const nextDay = Math.min(state.day + 1, 7)
  const practices = getDayPractices(state.sourceMirrorId)
  const practice = practices[nextDay - 1] ?? practices[practices.length - 1]
  const dateKey = todayKey()
  const nextRecords = [
    ...state.records.filter((record) => record.day !== nextDay),
    {
      day: nextDay,
      dateKey,
      title: practice.title,
      note: practice.note,
      actions: practice.actions,
      status,
      recordedAt: new Date().toISOString(),
      checkIn: entry?.checkIn,
      cultivationText: entry?.cultivationText,
      klineRecord: entry?.klineRecord,
    },
  ].sort((a, b) => a.day - b.day)
  const completedDays = completedRecordCount(nextRecords)

  return {
    ...state,
    day: nextDay,
    lastRecordedDate: dateKey,
    metrics: state.metrics.map((metric) => ({
      ...metric,
      current: metricProgress(metric.before, metric.direction, completedDays),
    })),
    records: nextRecords,
  }
}

export function getPracticePrescription(report?: AssessmentReport | null) {
  return getDayPractices(report?.sourceMirror?.id).map((item, index) => ({
    day: index + 1,
    ...item,
  }))
}

export function compareRiskRadarSnapshots(
  before?: PracticeRiskRadarSnapshot,
  after?: PracticeRiskRadarSnapshot,
): PracticeRadarComparison[] {
  if (!before || !after) return []

  return before.riskRadar.map((beforeItem) => {
    const afterItem = after.riskRadar.find((item) => item.key === beforeItem.key)
    const afterValue = clampScore(afterItem?.value ?? beforeItem.value)

    return {
      key: beforeItem.key,
      label: beforeItem.label,
      before: clampScore(beforeItem.value),
      after: afterValue,
      delta: afterValue - clampScore(beforeItem.value),
    }
  })
}
