"use client"

import { brandCharacterSequence, brandCharacterSystem, brandCharacterTiers } from "@yangming/content/brand-character-system"

import { YangmingCharacterMark, type YangmingCharacterTier } from "@/components/brand/yangming-character-mark"

type CharacterItem = {
  character: string
  key: string
  phrase: string
  role: string
  tier: YangmingCharacterTier
  usage: string
}

const tierOrder: YangmingCharacterTier[] = ["anchor", "method", "boundary"]

export function BrandCharacterSection() {
  const groupedCharacters = tierOrder.map((tier) => ({
    tier,
    meta: brandCharacterTiers[tier],
    items: (brandCharacterSystem.supportingCharacters as CharacterItem[]).filter((item) => item.tier === tier),
  }))

  return (
    <section className="brand-character-section" aria-label="照骨字系">
      <div className="character-field" aria-hidden="true" />
      <div className="character-shell">
        <div className="character-copy">
          <p className="eyebrow">{brandCharacterSystem.title}</p>
          <h2>{brandCharacterSystem.subtitle}</h2>
          <p>{brandCharacterSystem.principle}</p>
        </div>

        <div className="character-groups">
          {groupedCharacters.map((group) => (
            <div key={group.tier} className={`character-group tier-${group.tier}`}>
              <div className="group-heading">
                <span>{group.meta.label}</span>
                <p>{group.meta.description}</p>
              </div>
              <div className="character-list">
                {group.items.map((item) => (
                  <article key={item.key} className="character-item">
                    <YangmingCharacterMark
                      character={item.character}
                      label={`${item.character}字，${item.role}，${item.phrase}`}
                      roleText={item.role}
                      tier={item.tier}
                    />
                    <div>
                      <strong>{item.phrase}</strong>
                      <p>{item.usage}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="character-sequence" aria-label="照骨字系闭环">
          {brandCharacterSequence.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </div>

      <style jsx>{`
        .brand-character-section {
          position: relative;
          z-index: 10;
          isolation: isolate;
          overflow: hidden;
          padding: clamp(72px, 10vw, 132px) 1rem;
          color: #f4ebdd;
        }

        .brand-character-section::before {
          content: "";
          position: absolute;
          inset: 6% 0 0;
          z-index: -2;
          background:
            radial-gradient(circle at 20% 22%, rgba(216, 183, 111, 0.09), transparent 18rem),
            radial-gradient(circle at 84% 64%, rgba(95, 132, 117, 0.12), transparent 20rem),
            linear-gradient(180deg, transparent, rgba(17, 16, 13, 0.34) 34%, transparent);
          pointer-events: none;
        }

        .character-field {
          position: absolute;
          inset: 12% 4% 8%;
          z-index: -1;
          border: 1px solid rgba(216, 183, 111, 0.05);
          border-radius: 50%;
          opacity: 0.72;
          transform: rotate(-4deg);
          background-image:
            linear-gradient(rgba(216, 183, 111, 0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(216, 183, 111, 0.018) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(circle at 50% 50%, black, transparent 68%);
          pointer-events: none;
        }

        .character-shell {
          display: grid;
          width: min(100%, 1180px);
          margin: 0 auto;
          gap: clamp(2rem, 5vw, 4rem);
        }

        .character-copy {
          max-width: 42rem;
        }

        .eyebrow {
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: rgba(216, 183, 111, 0.66);
        }

        h2 {
          margin: 1rem 0 0;
          font-family: var(--font-story);
          font-size: clamp(2.35rem, 7vw, 5.6rem);
          font-weight: 300;
          line-height: 1.18;
          letter-spacing: 0.08em;
          color: rgba(244, 235, 221, 0.92);
        }

        .character-copy > p:not(.eyebrow) {
          max-width: 34rem;
          margin: 1.2rem 0 0;
          font-family: var(--font-story);
          font-size: 1rem;
          font-weight: 300;
          line-height: 1.9;
          letter-spacing: 0.045em;
          color: rgba(220, 212, 195, 0.58);
        }

        .character-groups {
          display: grid;
          gap: 1rem;
        }

        .character-group {
          display: grid;
          gap: 1rem;
          border-top: 1px solid rgba(172, 146, 83, 0.12);
          padding-top: 1rem;
        }

        .group-heading {
          display: grid;
          gap: 0.45rem;
        }

        .group-heading span {
          font-family: var(--font-function);
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: rgba(216, 183, 111, 0.68);
        }

        .tier-method .group-heading span {
          color: rgba(95, 132, 117, 0.78);
        }

        .tier-boundary .group-heading span {
          color: rgba(182, 91, 68, 0.76);
        }

        .group-heading p {
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.82rem;
          line-height: 1.7;
          letter-spacing: 0.06em;
          color: rgba(220, 212, 195, 0.42);
        }

        .character-list {
          display: grid;
          gap: 0.8rem;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .tier-anchor .character-list {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .tier-boundary .character-list {
          grid-template-columns: minmax(0, 1fr);
          max-width: 28rem;
        }

        .character-item {
          display: grid;
          min-height: 8.4rem;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 0.9rem;
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.014)),
            rgba(0, 0, 0, 0.1);
          padding: 0.95rem;
        }

        .character-item strong {
          display: block;
          font-family: var(--font-story);
          font-size: 1.12rem;
          font-weight: 300;
          line-height: 1.35;
          letter-spacing: 0.06em;
          color: rgba(242, 235, 220, 0.82);
        }

        .character-item p {
          margin: 0.55rem 0 0;
          font-family: var(--font-function);
          font-size: 0.76rem;
          line-height: 1.65;
          letter-spacing: 0.04em;
          color: rgba(220, 212, 195, 0.42);
        }

        .character-sequence {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
          border-top: 1px solid rgba(172, 146, 83, 0.12);
          padding-top: 1.1rem;
        }

        .character-sequence span {
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.018);
          padding: 0.46rem 0.7rem;
          font-family: var(--font-function);
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          color: rgba(220, 212, 195, 0.46);
        }

        @media (max-width: 900px) {
          .character-list,
          .tier-anchor .character-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .brand-character-section {
            padding-inline: 1.25rem;
          }

          .character-list,
          .tier-anchor .character-list,
          .tier-boundary .character-list {
            grid-template-columns: 1fr;
            max-width: none;
          }

          .character-item {
            min-height: 7.8rem;
          }
        }
      `}</style>
    </section>
  )
}
