import type { RuleGuardInsight } from "@/lib/mind-archive/ruleGuardInsightService"
import {
  RULE_GUARD_INSIGHT_EMPTY_TEXT,
  ruleGuardInsightLevelLabels,
  ruleGuardInsightSourceLabels,
} from "@/lib/mind-archive/ruleGuardInsightService"

export type ArchiveRuleGuardPanelProps = {
  insights?: RuleGuardInsight[]
}

export default function ArchiveRuleGuardPanel({ insights = [] }: ArchiveRuleGuardPanelProps) {
  return (
    <section className="danganguan-side-block" aria-label="规则守护">
      <div className="danganguan-eyebrow">规则守护</div>
      <h3>不强制拦截，只做提醒。</h3>
      <p>看见这类循环，下一笔才有可能停住。</p>
      {insights.length > 0 ? (
        <ul className="danganguan-signal-list">
          {insights.map((insight) => (
            <li key={insight.id}>
              <div>
                <strong>{insight.title}</strong>
                <span>{ruleGuardInsightSourceLabels[insight.source]} · {ruleGuardInsightLevelLabels[insight.level]}</span>
              </div>
              <p>{insight.text}</p>
              {insight.actionText ? <small>{insight.actionText}</small> : null}
              <small>
                {insight.count} 次 · 相关记录 {insight.relatedIds.length} 条
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="danganguan-signal-empty">{RULE_GUARD_INSIGHT_EMPTY_TEXT}</p>
      )}
    </section>
  )
}
