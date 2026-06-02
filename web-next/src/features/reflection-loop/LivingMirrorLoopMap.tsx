import { GlassPanel } from "@/features/assessment/components"
import { cn } from "@/lib/utils"

import type { LivingMirrorLoopNode } from "./reflectionLoopTypes"

export function LivingMirrorLoopMap({ nodes }: { nodes: LivingMirrorLoopNode[] }) {
  const activeNode = nodes.find((node) => node.status === "active")

  return (
    <GlassPanel className="living-mirror-loop overflow-hidden">
      <div className="living-mirror-loop-header">
        <div>
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">照见活镜闭环</p>
          <h2 className="mt-4 font-story text-[clamp(2rem,4vw,3.5rem)] font-light leading-[1.22] tracking-[.08em] text-[rgba(242,235,220,.9)]">
            《照见》活镜闭环。
          </h2>
          <p className="mt-4 max-w-[48rem] font-story text-lg font-light leading-9 tracking-[.045em] text-[rgba(220,212,195,.62)]">
            以交易照人心，以复盘照行为，以训练照变化，以活镜照成长。
          </p>
        </div>
        <p className="font-function text-sm leading-7 text-[rgba(220,212,195,.5)]">
          当前节点：{activeNode?.title || "下一次入照心"}
        </p>
      </div>

      <div className="living-mirror-loop-nodes mt-6">
        {nodes.map((node) => (
          <article
            key={node.id}
            className={cn("loop-node", `loop-node-${node.status}`)}
            aria-label={`${node.title}：${node.status}`}
          >
            <span className="loop-node-index">{String(node.index).padStart(2, "0")}</span>
            <div>
              <h3>{node.title}</h3>
              <p>{node.description}</p>
              <small>{node.sprintDisplayLabel}</small>
            </div>
          </article>
        ))}
      </div>

      <section className="loop-engineering-map mt-6" aria-label="内部研发节奏">
        <div className="loop-table-heading">
          <div>
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">内部研发节奏</p>
            <p className="mt-2 font-function text-sm leading-7 text-[rgba(220,212,195,.48)]">
              对用户展示闭环，对团队保留 Sprint 与沉淀对象。
            </p>
          </div>
        </div>
        <div className="loop-table mt-4">
          {nodes.map((node) => (
            <div key={`mapping-${node.id}`} className="loop-table-row">
              <span>{String(node.index).padStart(2, "0")}</span>
              <strong>{node.title}</strong>
              <em>{node.sprintLabel}</em>
              <code>{node.artifactLabel}</code>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-5 rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-4 py-3 font-function text-xs leading-6 text-[rgba(220,212,195,.42)]">
        locked 节点不会阻断浏览，只提示当前还未开启；完成新的心证、复盘、复测或承接后，闭环状态会继续前移。
      </p>

      <style jsx>{`
        .living-mirror-loop {
          position: relative;
        }

        .living-mirror-loop::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 16% 0%, rgba(216, 183, 111, 0.08), transparent 16rem),
            radial-gradient(circle at 84% 0%, rgba(95, 132, 117, 0.08), transparent 18rem);
          pointer-events: none;
        }

        .living-mirror-loop-header {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 1rem;
        }

        .living-mirror-loop-nodes {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 0.72rem;
        }

        .loop-node {
          position: relative;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 0.9rem;
          min-height: 6.2rem;
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.025);
          padding: 1rem;
          transition:
            opacity 240ms ease,
            border-color 240ms ease,
            background 240ms ease,
            box-shadow 240ms ease;
        }

        .loop-node::after {
          content: "";
          position: absolute;
          left: 1.55rem;
          bottom: -0.74rem;
          width: 1px;
          height: 0.74rem;
          background: rgba(172, 146, 83, 0.14);
        }

        .loop-node:last-child::after {
          display: none;
        }

        .loop-node-index {
          display: grid;
          width: 2.1rem;
          height: 2.1rem;
          place-items: center;
          border: 1px solid rgba(172, 146, 83, 0.18);
          border-radius: 50%;
          font-family: var(--font-function);
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          color: rgba(216, 183, 111, 0.72);
        }

        .loop-node h3 {
          margin: 0;
          font-family: var(--font-story);
          font-size: 1.2rem;
          font-weight: 300;
          letter-spacing: 0.06em;
          color: rgba(242, 235, 220, 0.84);
        }

        .loop-node p {
          margin: 0.55rem 0 0;
          font-family: var(--font-function);
          font-size: 0.8rem;
          line-height: 1.7;
          color: rgba(220, 212, 195, 0.48);
        }

        .loop-node small {
          display: block;
          margin-top: 0.9rem;
          border-top: 1px solid rgba(172, 146, 83, 0.1);
          padding-top: 0.75rem;
          font-family: var(--font-function);
          font-size: 0.68rem;
          line-height: 1.5;
          letter-spacing: 0.12em;
          color: rgba(216, 183, 111, 0.62);
        }

        .loop-node-done {
          border-color: rgba(95, 132, 117, 0.28);
          background: rgba(95, 132, 117, 0.055);
        }

        .loop-node-done .loop-node-index {
          border-color: rgba(95, 132, 117, 0.34);
          color: rgba(183, 210, 196, 0.72);
        }

        .loop-node-active {
          border-color: rgba(216, 183, 111, 0.46);
          background:
            radial-gradient(circle at 50% 0%, rgba(216, 183, 111, 0.13), transparent 9rem),
            rgba(255, 255, 255, 0.036);
          box-shadow:
            0 0 0 1px rgba(216, 183, 111, 0.08),
            0 18px 56px rgba(0, 0, 0, 0.28),
            0 0 42px rgba(216, 183, 111, 0.1);
        }

        .loop-node-active .loop-node-index {
          border-color: rgba(216, 183, 111, 0.55);
          background: rgba(216, 183, 111, 0.1);
          color: rgba(244, 235, 221, 0.9);
          box-shadow: 0 0 22px rgba(216, 183, 111, 0.14);
        }

        .loop-node-locked {
          opacity: 0.42;
        }

        .loop-engineering-map {
          position: relative;
          z-index: 1;
          border-top: 1px solid rgba(172, 146, 83, 0.12);
          padding-top: 1.25rem;
        }

        .loop-table-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 1rem;
        }

        .loop-table {
          display: grid;
          gap: 0.5rem;
        }

        .loop-table-row {
          display: grid;
          grid-template-columns: 3rem minmax(0, 1fr);
          gap: 0.55rem 0.85rem;
          border: 1px solid rgba(172, 146, 83, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.022);
          padding: 0.78rem 0.9rem;
          font-family: var(--font-function);
        }

        .loop-table-row span {
          color: rgba(216, 183, 111, 0.6);
          font-size: 0.72rem;
          letter-spacing: 0.12em;
        }

        .loop-table-row strong {
          min-width: 0;
          color: rgba(242, 235, 220, 0.78);
          font-size: 0.86rem;
          font-weight: 600;
          letter-spacing: 0.08em;
        }

        .loop-table-row em,
        .loop-table-row code {
          font-style: normal;
          font-size: 0.72rem;
          line-height: 1.6;
          color: rgba(220, 212, 195, 0.42);
        }

        .loop-table-row code {
          overflow-wrap: anywhere;
        }

        @media (min-width: 920px) {
          .living-mirror-loop-header {
            grid-template-columns: minmax(0, 1fr) minmax(260px, 0.32fr);
            align-items: end;
          }

          .living-mirror-loop-nodes {
            grid-template-columns: repeat(11, minmax(132px, 1fr));
            overflow-x: auto;
            padding-bottom: 0.4rem;
          }

          .loop-node {
            grid-template-columns: 1fr;
            align-content: start;
            min-width: 132px;
            min-height: 12.4rem;
          }

          .loop-node::after {
            left: auto;
            right: -0.74rem;
            bottom: auto;
            top: 2rem;
            width: 0.74rem;
            height: 1px;
          }

          .loop-table-row {
            grid-template-columns: 3rem minmax(150px, 0.55fr) minmax(120px, 0.28fr) minmax(180px, 0.48fr);
            align-items: center;
          }
        }
      `}</style>
    </GlassPanel>
  )
}
