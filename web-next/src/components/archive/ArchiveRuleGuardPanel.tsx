import type { ReviewRiskSignal } from "@/lib/mind-archive/reviewArchiveService"
import {
  REVIEW_RISK_SIGNAL_EMPTY_TEXT,
  getTopReviewRiskSignals,
  reviewRiskSignalLevelLabels,
  reviewRiskSignalTypeLabels,
} from "@/lib/mind-archive/reviewRiskSignalDisplay"

export type ArchiveRuleGuardPanelProps = {
  reviewRiskSignals?: ReviewRiskSignal[]
}

export default function ArchiveRuleGuardPanel({ reviewRiskSignals = [] }: ArchiveRuleGuardPanelProps) {
  const topSignals = getTopReviewRiskSignals(reviewRiskSignals)

  return (
    <section className="danganguan-side-block" aria-label="规则守护">
      <div className="danganguan-eyebrow">规则守护</div>
      <h3>不强制拦截，只做提醒。</h3>
      <p>看见这类循环，下一笔才有可能停住。</p>
      {topSignals.length > 0 ? (
        <ul className="danganguan-signal-list">
          {topSignals.map((signal) => (
            <li key={signal.type}>
              <div>
                <strong>{reviewRiskSignalTypeLabels[signal.type]}</strong>
                <span>{reviewRiskSignalLevelLabels[signal.level]}</span>
              </div>
              <p>{signal.text}</p>
              <small>
                {signal.count} 次 · 相关复盘 {signal.relatedReviewIds.length} 条
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="danganguan-signal-empty">{REVIEW_RISK_SIGNAL_EMPTY_TEXT}</p>
      )}
    </section>
  )
}
