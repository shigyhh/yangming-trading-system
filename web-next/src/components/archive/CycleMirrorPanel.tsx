import type { CycleMirrorResult, RecurringBehaviorType, RecurringCapitalPatternType } from "@/lib/mind-archive/cycleMirrorService"
import { getTopCycleItems } from "@/lib/mind-archive/cycleMirrorService"

export const CYCLE_MIRROR_EMPTY_TEXT = "暂无明显循环。不是没有问题，而是还需要更多真实复盘样本。"

export const cycleSeverityLabels = {
  low: "轻循环",
  medium: "明显循环",
  high: "强循环",
} as const

export const recurringBehaviorLabels: Record<RecurringBehaviorType, string> = {
  still_moving_then_traded: "心还在动仍交易",
  broke_rule: "反复破戒",
  added_position: "反复加仓",
  moved_stop_loss: "移动止损",
  changed_plan_intraday: "临盘改计划",
}

export const recurringCapitalPatternLabels: Record<RecurringCapitalPatternType, string> = {
  money_moving_heart_chaotic: "钱动心乱",
  double_unstable: "双失守",
  money_stable_heart_moving: "钱稳心动",
  capital_insufficient_data: "资金证不足",
}

export type CycleMirrorPanelProps = {
  cycleMirror?: CycleMirrorResult | null
}

function formatCount(count: number | undefined) {
  return `${count ?? 0} 次`
}

export default function CycleMirrorPanel({ cycleMirror }: CycleMirrorPanelProps) {
  const [topThought] = getTopCycleItems(cycleMirror?.recurringThoughts ?? [])
  const [topBehavior] = getTopCycleItems(cycleMirror?.recurringBehaviors ?? [])
  const [topCapitalPattern] = getTopCycleItems(cycleMirror?.recurringCapitalPatterns ?? [])
  const hasCycleData = Boolean(
    topThought ||
      topBehavior ||
      topCapitalPattern ||
      (cycleMirror?.cycleSignals.length ?? 0) > 0,
  )

  return (
    <section className="danganguan-side-block" aria-label="循环之镜">
      <div className="danganguan-eyebrow">循环之镜</div>
      <h3>你以为这是新行情，其实是旧心贼换了张脸。</h3>
      {hasCycleData ? (
        <>
          <div className="danganguan-cycle-list">
            {topThought ? (
              <div>
                <span>最强复发念</span>
                <strong>「{topThought.os || topThought.key}」</strong>
                <small>{formatCount(topThought.count)} · {cycleSeverityLabels[topThought.severity]}</small>
              </div>
            ) : null}
            {topBehavior ? (
              <div>
                <span>最强复发行为</span>
                <strong>{recurringBehaviorLabels[topBehavior.type]}</strong>
                <small>{formatCount(topBehavior.count)} · {cycleSeverityLabels[topBehavior.severity]}</small>
              </div>
            ) : null}
            {topCapitalPattern ? (
              <div>
                <span>最强资金伤害</span>
                <strong>{recurringCapitalPatternLabels[topCapitalPattern.type]}</strong>
                <small>{formatCount(topCapitalPattern.count)} · {cycleSeverityLabels[topCapitalPattern.severity]}</small>
              </div>
            ) : null}
          </div>
          <p className="danganguan-cycle-conclusion">{cycleMirror?.cycleSummary.conclusionText}</p>
        </>
      ) : (
        <p className="danganguan-cycle-empty">{CYCLE_MIRROR_EMPTY_TEXT}</p>
      )}
    </section>
  )
}
