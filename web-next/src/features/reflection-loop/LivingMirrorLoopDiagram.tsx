import Link from "next/link"

import { GlassPanel } from "@/features/assessment/components"
import { cn } from "@/lib/utils"

import { getLivingMirrorLoopSummary } from "./reflectionLoopEngine"
import { livingMirrorLoopPrinciples } from "./livingMirrorLoopNodes"
import type { LivingMirrorLoopNode } from "./reflectionLoopTypes"

const complianceText = "本系统仅用于交易心理训练与行为复盘，不预测行情，不提供买卖建议，不构成任何投资建议。"

export function LivingMirrorLoopDiagram({ nodes }: { nodes: LivingMirrorLoopNode[] }) {
  const summary = getLivingMirrorLoopSummary(nodes)
  const activeNode = summary.activeNode

  return (
    <GlassPanel className="living-loop-diagram overflow-hidden">
      <div className="living-loop-header">
        <div>
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">照见活镜主线</p>
          <h2 className="mt-4 font-story text-[clamp(2.2rem,4.6vw,4.6rem)] font-light leading-[1.15] tracking-[.08em] text-[rgba(244,235,221,.9)]">
            《照见》活镜闭环
          </h2>
          <p className="mt-4 max-w-[46rem] font-story text-lg font-light leading-9 tracking-[.05em] text-[rgba(220,212,195,.62)]">
            从一念入照，到行为复盘，再到变化证明。
          </p>
        </div>
        <div className="living-loop-current" aria-label="当前闭环节点">
          <span>当前节点</span>
          <strong>{activeNode?.title || "下一次入照心"}</strong>
        </div>
      </div>

      <div className="loop-ring-stage" aria-label="《照见》活镜闭环图">
        <svg className="loop-ring-orbit" viewBox="0 0 1000 660" aria-hidden="true">
          <defs>
            <marker id="loop-arrow-head" markerHeight="8" markerWidth="8" orient="auto" refX="6" refY="4">
              <path d="M0,0 L8,4 L0,8 Z" fill="rgba(216,183,111,.54)" />
            </marker>
          </defs>
          <path
            d="M500 62 C742 62 918 186 918 330 C918 474 742 598 500 598 C258 598 82 474 82 330 C82 186 258 62 500 62"
            fill="none"
            markerEnd="url(#loop-arrow-head)"
            stroke="rgba(216,183,111,.2)"
            strokeDasharray="8 14"
            strokeWidth="1.2"
          />
        </svg>

        <div className="loop-ring-center" aria-label="闭环原则">
          <p>四句主心骨</p>
          <div>
            {livingMirrorLoopPrinciples.map((principle) => (
              <span key={principle}>{principle}</span>
            ))}
          </div>
        </div>

        {nodes.map((node) => (
          <LoopNodeCard
            key={node.id}
            className={`loop-ring-card loop-card-position-${node.index}`}
            node={node}
            variant="ring"
          />
        ))}
      </div>

      <div className="loop-mobile-shell" aria-label="《照见》活镜闭环移动端卡片">
        <div className="loop-mobile-principles">
          {livingMirrorLoopPrinciples.map((principle) => (
            <span key={`mobile-${principle}`}>{principle}</span>
          ))}
        </div>
        <div className="loop-mobile-track">
          {nodes.map((node) => (
            <LoopNodeCard key={`mobile-${node.id}`} className="loop-mobile-card" node={node} variant="mobile" />
          ))}
        </div>
      </div>

      <section className="loop-evidence-bridge" aria-label="闭环证据">
        <div>
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">闭环证据</p>
          <h3>{summary.isClosed ? "一轮已闭，回到下一次入照心。" : `当前要补：${activeNode.title}`}</h3>
          <p>{summary.activeActionText}</p>
        </div>
        <div className="loop-evidence-stats">
          <LoopEvidenceStat label="已完成" value={`${summary.doneCount}/${summary.totalCount}`} />
          <LoopEvidenceStat label="当前产物" value={activeNode.outputObject} />
          <LoopEvidenceStat label="待开启" value={`${summary.lockedCount} 个节点`} />
        </div>
        <p className="loop-next-evidence">
          下一枚证据：{summary.nextEvidenceText}
        </p>
      </section>

      <section className="loop-engineering-map" aria-label="内部研发节奏">
        <div className="loop-engineering-head">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">内部研发节奏</p>
          <span>对用户展示闭环，对团队保留 Sprint。</span>
        </div>
        <div className="loop-engineering-grid">
          {nodes.map((node) => (
            <div key={`engineering-${node.id}`} className="loop-engineering-row">
              <span>{String(node.index).padStart(2, "0")}</span>
              <strong>{node.title}</strong>
              <em>{node.sprintLabel}</em>
              <code>{node.outputObject}</code>
            </div>
          ))}
        </div>
      </section>

      <p className="loop-compliance">{complianceText}</p>

      <style jsx global>{`
        .living-loop-diagram {
          position: relative;
          isolation: isolate;
        }

        .living-loop-diagram::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(circle at 50% 45%, rgba(216, 183, 111, 0.1), transparent 22rem),
            radial-gradient(circle at 18% 10%, rgba(95, 132, 117, 0.08), transparent 18rem),
            linear-gradient(120deg, rgba(255, 255, 255, 0.02), transparent 42%);
          pointer-events: none;
        }

        .living-loop-diagram::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background-image:
            radial-gradient(circle, rgba(216, 183, 111, 0.12) 0 1px, transparent 1px),
            radial-gradient(circle, rgba(244, 235, 221, 0.08) 0 1px, transparent 1px);
          background-position:
            0 0,
            28px 34px;
          background-size:
            90px 90px,
            128px 128px;
          opacity: 0.18;
          pointer-events: none;
        }

        .living-loop-header {
          position: relative;
          z-index: 2;
          display: grid;
          gap: 1rem;
        }

        .living-loop-current {
          align-self: end;
          border: 1px solid rgba(172, 146, 83, 0.14);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.028);
          padding: 1rem;
          font-family: var(--font-function);
        }

        .living-loop-current span {
          display: block;
          font-size: 0.72rem;
          letter-spacing: 0.16em;
          color: rgba(180, 157, 93, 0.68);
        }

        .living-loop-current strong {
          display: block;
          margin-top: 0.6rem;
          font-family: var(--font-story);
          font-size: 1.35rem;
          font-weight: 300;
          letter-spacing: 0.08em;
          color: rgba(244, 235, 221, 0.84);
        }

        .loop-ring-stage {
          position: relative;
          z-index: 1;
          display: none;
          min-height: 760px;
          margin: 1.25rem auto 0;
          max-width: 1180px;
          overflow: hidden;
        }

        .loop-ring-orbit {
          position: absolute;
          inset: 7% 2%;
          width: 96%;
          height: 86%;
          filter: drop-shadow(0 0 18px rgba(216, 183, 111, 0.08));
          opacity: 0.86;
        }

        .loop-ring-center {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(34vw, 360px);
          min-height: 260px;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(172, 146, 83, 0.16);
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 34%, rgba(216, 183, 111, 0.1), transparent 9rem),
            rgba(6, 6, 5, 0.68);
          box-shadow:
            inset 0 0 48px rgba(216, 183, 111, 0.05),
            0 24px 80px rgba(0, 0, 0, 0.42);
          display: grid;
          place-items: center;
          padding: 2.2rem;
          text-align: center;
        }

        .loop-ring-center p {
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: rgba(180, 157, 93, 0.7);
        }

        .loop-ring-center div {
          display: grid;
          gap: 0.75rem;
          margin-top: 0.9rem;
        }

        .loop-ring-center span {
          font-family: var(--font-story);
          font-size: clamp(1.05rem, 1.5vw, 1.45rem);
          font-weight: 300;
          letter-spacing: 0.08em;
          color: rgba(244, 235, 221, 0.78);
        }

        .loop-mobile-shell {
          position: relative;
          z-index: 2;
          margin-top: 1.25rem;
        }

        .loop-mobile-principles {
          display: flex;
          gap: 0.55rem;
          overflow-x: auto;
          padding-bottom: 0.7rem;
          scrollbar-width: none;
        }

        .loop-mobile-principles::-webkit-scrollbar {
          display: none;
        }

        .loop-mobile-principles span {
          flex: 0 0 auto;
          border: 1px solid rgba(172, 146, 83, 0.16);
          border-radius: 999px;
          background: rgba(180, 157, 93, 0.055);
          padding: 0.5rem 0.8rem;
          font-family: var(--font-function);
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          color: rgba(216, 183, 111, 0.72);
        }

        .loop-mobile-track {
          display: flex;
          gap: 0.85rem;
          overflow-x: auto;
          overscroll-behavior-x: contain;
          scroll-snap-type: x mandatory;
          padding: 0.2rem 0 0.8rem;
          scrollbar-width: none;
        }

        .loop-mobile-track::-webkit-scrollbar {
          display: none;
        }

        .loop-evidence-bridge {
          position: relative;
          z-index: 2;
          display: grid;
          gap: 1rem;
          margin-top: 1.15rem;
          border: 1px solid rgba(172, 146, 83, 0.14);
          border-radius: 8px;
          background:
            radial-gradient(circle at 12% 0%, rgba(216, 183, 111, 0.08), transparent 14rem),
            rgba(255, 255, 255, 0.026);
          padding: 1rem;
        }

        .loop-evidence-bridge h3 {
          margin: 0.55rem 0 0;
          font-family: var(--font-story);
          font-size: clamp(1.35rem, 2vw, 2rem);
          font-weight: 300;
          letter-spacing: 0.06em;
          color: rgba(244, 235, 221, 0.84);
        }

        .loop-evidence-bridge p {
          margin: 0.55rem 0 0;
          font-family: var(--font-function);
          font-size: 0.82rem;
          line-height: 1.8;
          color: rgba(220, 212, 195, 0.52);
        }

        .loop-evidence-stats {
          display: grid;
          gap: 0.65rem;
        }

        .loop-next-evidence {
          border-top: 1px solid rgba(172, 146, 83, 0.1);
          padding-top: 0.85rem;
        }

        .loop-engineering-map {
          position: relative;
          z-index: 2;
          margin-top: 1rem;
          border-top: 1px solid rgba(172, 146, 83, 0.12);
          padding-top: 1rem;
        }

        .loop-engineering-head {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .loop-engineering-head span {
          font-family: var(--font-function);
          font-size: 0.76rem;
          line-height: 1.7;
          color: rgba(220, 212, 195, 0.44);
        }

        .loop-engineering-grid {
          display: grid;
          gap: 0.5rem;
          margin-top: 0.8rem;
        }

        .loop-engineering-row {
          display: grid;
          grid-template-columns: 2.3rem minmax(0, 1fr);
          gap: 0.35rem 0.7rem;
          border: 1px solid rgba(172, 146, 83, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          padding: 0.72rem 0.78rem;
          font-family: var(--font-function);
        }

        .loop-engineering-row span {
          font-size: 0.68rem;
          letter-spacing: 0.14em;
          color: rgba(216, 183, 111, 0.58);
        }

        .loop-engineering-row strong {
          min-width: 0;
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: rgba(244, 235, 221, 0.72);
        }

        .loop-engineering-row em,
        .loop-engineering-row code {
          font-size: 0.7rem;
          font-style: normal;
          line-height: 1.55;
          color: rgba(220, 212, 195, 0.42);
        }

        .loop-engineering-row code {
          overflow-wrap: anywhere;
        }

        .loop-compliance {
          position: relative;
          z-index: 2;
          margin-top: 1rem;
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.025);
          padding: 0.85rem 1rem;
          text-align: center;
          font-family: var(--font-function);
          font-size: 0.72rem;
          line-height: 1.8;
          letter-spacing: 0.04em;
          color: rgba(220, 212, 195, 0.46);
        }

        @media (min-width: 920px) {
          .living-loop-header {
            grid-template-columns: minmax(0, 1fr) minmax(220px, 0.24fr);
            align-items: end;
          }

          .loop-ring-stage {
            display: block;
          }

          .loop-mobile-shell {
            display: none;
          }

          .loop-evidence-bridge {
            grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.8fr);
            align-items: start;
          }

          .loop-evidence-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .loop-next-evidence {
            grid-column: 1 / -1;
          }

          .loop-engineering-head {
            flex-direction: row;
            align-items: end;
            justify-content: space-between;
          }

          .loop-engineering-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .loop-engineering-row {
            grid-template-columns: 2.3rem minmax(0, 1fr);
            min-height: 7.1rem;
          }
        }

        @media (max-width: 919px) {
          .living-loop-header {
            gap: 1.1rem;
          }
        }
      `}</style>
    </GlassPanel>
  )
}

function LoopEvidenceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="loop-evidence-stat">
      <span>{label}</span>
      <strong>{value}</strong>

      <style jsx global>{`
        .living-loop-diagram .loop-evidence-stat {
          min-width: 0;
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.024);
          padding: 0.85rem;
        }

        .living-loop-diagram .loop-evidence-stat span {
          display: block;
          font-family: var(--font-function);
          font-size: 0.68rem;
          letter-spacing: 0.14em;
          color: rgba(180, 157, 93, 0.62);
        }

        .living-loop-diagram .loop-evidence-stat strong {
          display: block;
          margin-top: 0.55rem;
          overflow-wrap: anywhere;
          font-family: var(--font-story);
          font-size: clamp(1.1rem, 1.6vw, 1.45rem);
          font-weight: 300;
          letter-spacing: 0.06em;
          color: rgba(244, 235, 221, 0.8);
        }
      `}</style>
    </div>
  )
}

function LoopNodeCard({
  node,
  className,
  variant,
}: {
  node: LivingMirrorLoopNode
  className?: string
  variant: "ring" | "mobile"
}) {
  const number = String(node.index).padStart(2, "0")
  const isLastNode = node.id === "next_enter_reflection"
  const href = node.route || "/mirror-archive"

  return (
    <>
      <Link
        href={href}
        className={cn("loop-node-card", `loop-node-card-${node.status}`, className)}
        data-status={node.status}
        scroll={false}
        aria-label={`${number} ${node.title}，${node.status}`}
      >
        <span className="loop-node-topline">
          <span className="loop-node-number">{number}</span>
          <span className="loop-node-sprint">{node.sprintLabel}</span>
          <span className="loop-card-arrow" aria-hidden="true">
            {isLastNode ? "↺" : "→"}
          </span>
        </span>
        <h3>{node.title}</h3>
        <p>{node.subtitle}</p>
        <dl>
          <div>
            <dt>产出对象</dt>
            <dd>{node.outputObject}</dd>
          </div>
          <div>
            <dt>所属原则</dt>
            <dd>{node.principle}</dd>
          </div>
        </dl>
        {isLastNode ? <span className="loop-return-arrow">回到 01 入照心</span> : null}
        {variant === "mobile" && !isLastNode ? <span className="loop-mobile-next">下一节点</span> : null}
      </Link>

      <style jsx global>{`
        .living-loop-diagram .loop-node-card {
          position: relative;
          display: flex;
          min-width: 0;
          min-height: 150px;
          flex-direction: column;
          border: 1px solid rgba(172, 146, 83, 0.16);
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.018)),
            rgba(10, 9, 7, 0.86);
          color: inherit;
          overflow: hidden;
          padding: 0.95rem;
          text-decoration: none;
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
          transition:
            border-color 220ms ease,
            box-shadow 220ms ease,
            opacity 220ms ease,
            transform 220ms ease;
        }

        .living-loop-diagram .loop-node-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 0%, rgba(216, 183, 111, 0.12), transparent 8rem),
            radial-gradient(circle at 12% 88%, rgba(95, 132, 117, 0.08), transparent 7rem);
          opacity: 0.66;
          pointer-events: none;
        }

        .living-loop-diagram .loop-node-card:hover {
          border-color: rgba(216, 183, 111, 0.36);
          box-shadow:
            0 20px 52px rgba(0, 0, 0, 0.34),
            0 0 34px rgba(216, 183, 111, 0.08);
          transform: translateY(-2px);
        }

        .living-loop-diagram .loop-node-topline {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.7rem;
        }

        .living-loop-diagram .loop-node-number {
          display: grid;
          width: 2.05rem;
          height: 2.05rem;
          place-items: center;
          border: 1px solid rgba(172, 146, 83, 0.18);
          border-radius: 50%;
          font-family: var(--font-function);
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          color: rgba(216, 183, 111, 0.72);
        }

        .living-loop-diagram .loop-node-sprint {
          min-width: 0;
          margin-left: auto;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: var(--font-function);
          font-size: 0.62rem;
          letter-spacing: 0.08em;
          color: rgba(220, 212, 195, 0.34);
        }

        .living-loop-diagram .loop-card-arrow {
          font-family: var(--font-story);
          font-size: 1.45rem;
          line-height: 1;
          color: rgba(216, 183, 111, 0.62);
        }

        .living-loop-diagram .loop-node-card h3,
        .living-loop-diagram .loop-node-card p,
        .living-loop-diagram .loop-node-card dl,
        .living-loop-diagram .loop-return-arrow,
        .living-loop-diagram .loop-mobile-next {
          position: relative;
          z-index: 1;
        }

        .living-loop-diagram .loop-node-card h3 {
          margin: 0.8rem 0 0;
          font-family: var(--font-story);
          font-size: 1.08rem;
          font-weight: 300;
          letter-spacing: 0.06em;
          color: rgba(244, 235, 221, 0.86);
        }

        .living-loop-diagram .loop-node-card p {
          margin: 0.45rem 0 0;
          min-height: 3.4em;
          font-family: var(--font-function);
          font-size: 0.74rem;
          line-height: 1.7;
          color: rgba(220, 212, 195, 0.5);
        }

        .living-loop-diagram .loop-node-card dl {
          display: grid;
          gap: 0.45rem;
          margin: auto 0 0;
          padding-top: 0.85rem;
        }

        .living-loop-diagram .loop-node-card dl > div {
          display: grid;
          gap: 0.22rem;
          border-top: 1px solid rgba(172, 146, 83, 0.1);
          padding-top: 0.5rem;
        }

        .living-loop-diagram .loop-node-card dt,
        .living-loop-diagram .loop-node-card dd {
          margin: 0;
          font-family: var(--font-function);
        }

        .living-loop-diagram .loop-node-card dt {
          font-size: 0.62rem;
          letter-spacing: 0.14em;
          color: rgba(180, 157, 93, 0.58);
        }

        .living-loop-diagram .loop-node-card dd {
          overflow-wrap: anywhere;
          font-size: 0.72rem;
          line-height: 1.5;
          color: rgba(244, 235, 221, 0.62);
        }

        .living-loop-diagram .loop-return-arrow,
        .living-loop-diagram .loop-mobile-next {
          margin-top: 0.75rem;
          width: fit-content;
          border: 1px solid rgba(216, 183, 111, 0.16);
          border-radius: 999px;
          background: rgba(216, 183, 111, 0.07);
          padding: 0.38rem 0.62rem;
          font-family: var(--font-function);
          font-size: 0.68rem;
          letter-spacing: 0.08em;
          color: rgba(216, 183, 111, 0.72);
        }

        .living-loop-diagram .loop-mobile-next {
          color: rgba(220, 212, 195, 0.42);
        }

        .living-loop-diagram .loop-node-card-done {
          border-color: rgba(95, 132, 117, 0.3);
          background:
            linear-gradient(180deg, rgba(95, 132, 117, 0.08), rgba(255, 255, 255, 0.02)),
            rgba(9, 10, 8, 0.86);
        }

        .living-loop-diagram .loop-node-card-done .loop-node-number {
          border-color: rgba(95, 132, 117, 0.34);
          color: rgba(183, 210, 196, 0.78);
        }

        .living-loop-diagram .loop-node-card-active {
          border-color: rgba(216, 183, 111, 0.5);
          box-shadow:
            0 22px 58px rgba(0, 0, 0, 0.42),
            0 0 0 1px rgba(216, 183, 111, 0.08),
            0 0 44px rgba(216, 183, 111, 0.16);
        }

        .living-loop-diagram .loop-node-card-active .loop-node-number {
          border-color: rgba(216, 183, 111, 0.55);
          background: rgba(216, 183, 111, 0.11);
          color: rgba(244, 235, 221, 0.9);
        }

        .living-loop-diagram .loop-node-card-locked {
          opacity: 0.48;
        }

        .living-loop-diagram .loop-node-card-locked:hover {
          opacity: 0.68;
        }

        .living-loop-diagram .loop-ring-card {
          position: absolute;
          width: clamp(132px, 11.4vw, 164px);
        }

        .living-loop-diagram .loop-mobile-card {
          flex: 0 0 min(82vw, 330px);
          scroll-snap-align: start;
        }

        .living-loop-diagram .loop-card-position-1 {
          left: 50%;
          top: 0.6%;
          transform: translateX(-50%);
        }

        .living-loop-diagram .loop-card-position-1:hover {
          transform: translateX(-50%) translateY(-2px);
        }

        .living-loop-diagram .loop-card-position-2 {
          left: 64%;
          top: 3%;
          transform: translateX(-50%);
        }

        .living-loop-diagram .loop-card-position-2:hover {
          transform: translateX(-50%) translateY(-2px);
        }

        .living-loop-diagram .loop-card-position-3 {
          left: 78%;
          top: 12%;
          transform: translateX(-50%);
        }

        .living-loop-diagram .loop-card-position-3:hover {
          transform: translateX(-50%) translateY(-2px);
        }

        .living-loop-diagram .loop-card-position-4 {
          left: 88%;
          top: 27%;
          transform: translateX(-50%);
        }

        .living-loop-diagram .loop-card-position-4:hover {
          transform: translateX(-50%) translateY(-2px);
        }

        .living-loop-diagram .loop-card-position-5 {
          left: 90%;
          top: 45%;
          transform: translateX(-50%);
        }

        .living-loop-diagram .loop-card-position-5:hover {
          transform: translateX(-50%) translateY(-2px);
        }

        .living-loop-diagram .loop-card-position-6 {
          left: 82%;
          top: 62%;
          transform: translateX(-50%);
        }

        .living-loop-diagram .loop-card-position-6:hover {
          transform: translateX(-50%) translateY(-2px);
        }

        .living-loop-diagram .loop-card-position-7 {
          left: 66%;
          top: 75%;
          transform: translateX(-50%);
        }

        .living-loop-diagram .loop-card-position-7:hover {
          transform: translateX(-50%) translateY(-2px);
        }

        .living-loop-diagram .loop-card-position-8 {
          left: 50%;
          top: 80%;
          transform: translateX(-50%);
        }

        .living-loop-diagram .loop-card-position-8:hover {
          transform: translateX(-50%) translateY(-2px);
        }

        .living-loop-diagram .loop-card-position-9 {
          left: 34%;
          top: 75%;
          transform: translateX(-50%);
        }

        .living-loop-diagram .loop-card-position-9:hover {
          transform: translateX(-50%) translateY(-2px);
        }

        .living-loop-diagram .loop-card-position-10 {
          left: 18%;
          top: 62%;
          transform: translateX(-50%);
        }

        .living-loop-diagram .loop-card-position-10:hover {
          transform: translateX(-50%) translateY(-2px);
        }

        .living-loop-diagram .loop-card-position-11 {
          left: 10%;
          top: 45%;
          transform: translateX(-50%);
        }

        .living-loop-diagram .loop-card-position-11:hover {
          transform: translateX(-50%) translateY(-2px);
        }

        .living-loop-diagram .loop-card-position-12 {
          left: 12%;
          top: 27%;
          transform: translateX(-50%);
        }

        .living-loop-diagram .loop-card-position-12:hover {
          transform: translateX(-50%) translateY(-2px);
        }

        .living-loop-diagram .loop-card-position-13 {
          left: 22%;
          top: 12%;
          transform: translateX(-50%);
        }

        .living-loop-diagram .loop-card-position-13:hover {
          transform: translateX(-50%) translateY(-2px);
        }

        .living-loop-diagram .loop-card-position-14 {
          left: 36%;
          top: 3%;
          transform: translateX(-50%);
        }

        .living-loop-diagram .loop-card-position-14:hover {
          transform: translateX(-50%) translateY(-2px);
        }
      `}</style>
    </>
  )
}
