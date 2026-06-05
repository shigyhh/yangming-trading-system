"use client"

import type { CSSProperties } from "react"
import Link from "next/link"

import { YangmingCharacterMark, type YangmingCharacterTier } from "@/components/brand/yangming-character-mark"
import { YangmingA1Mark, YangmingC16Mark, YangmingGlyph } from "@/components/brand/yangming-mark"
import { YangmingZhaoSeal } from "@/components/brand/yangming-zhao-seal"
import { brandCharacterSequence, brandCharacterSystem, brandMotionSystem } from "@yangming/content/brand-character-system"
import { brandMantras } from "@yangming/content/brand"

type SupportingCharacter = {
  character: string
  key: string
  phrase: string
  role: string
  tier: YangmingCharacterTier
  usage: string
}

type MotionSample = {
  character: string
  className: string
  key: string
  motion: string
  usage: string
}

const glyphSamples = [
  { kind: "trade", label: "交易", text: "以交易照人心" },
  { kind: "review", label: "复盘", text: "以复盘照行为" },
  { kind: "train", label: "训练", text: "以训练照变化" },
  { kind: "growth", label: "成长", text: "以活镜照成长" },
] as const

const toneSamples = [
  { label: "已照见", tone: "gold", note: "报告生成" },
  { label: "已存档", tone: "cinnabar", note: "保存报告" },
  { label: "待事上练", tone: "ink", note: "七日训练" },
] as const

const auditItems = [
  "主标唯一：最高识别仍然只用「照」。",
  "辅助字降级：心、知、行、止、证、复、练、界只做模块锚点。",
  "场景一致：报告、分享卡、短视频都从同一套照印资产出发。",
  "边界清楚：不展示行情、收益、个股、买卖点。",
]

export default function BrandAssetsPreviewPage() {
  const supportingCharacters = brandCharacterSystem.supportingCharacters as SupportingCharacter[]
  const motionSamples = [brandMotionSystem.mainMotion, ...brandMotionSystem.supportingMotions] as MotionSample[]

  return (
    <main className="brand-preview-page" aria-label="阳明品牌资产预览页">
      <div className="ink-grid" aria-hidden="true" />
      <header className="preview-hero">
        <Link href="/" className="back-link">
          回到首页
        </Link>
        <div className="hero-lockup">
          <span className="hero-mini-mark">
            <YangmingC16Mark className="size-7" title="阳明照见品牌资产预览小标" />
          </span>
          <div>
            <p>阳明心学交易系统</p>
            <span>BRAND ASSET PREVIEW</span>
          </div>
        </div>
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">BRAND BOARD</p>
            <h1>一眼看清，哪些已成气候。</h1>
            <p className="hero-desc">
              这页只做品牌资产体检：主照印、照骨字系、功能母题和关键物料放在同一张暗场里，看强弱、看统一、看边界。
            </p>
          </div>
          <div className="hero-seal-stage" aria-label="主照印预览">
            <div className="hero-ring" aria-hidden="true" />
            <YangmingZhaoSeal
              className="hero-zhao"
              size="hero"
              title="阳明照见主照印预览"
              style={
                {
                  "--zhao-seal-color": "rgba(216, 183, 111, 0.82)",
                  "--zhao-seal-border": "rgba(216, 183, 111, 0.34)",
                  "--zhao-seal-glow": "rgba(216, 183, 111, 0.08)",
                } as CSSProperties
              }
            />
          </div>
        </div>
      </header>

      <section className="preview-section identity-section" aria-label="主标与小标">
        <SectionHeading
          kicker="PRIMARY IDENTITY"
          title="主照印必须最强。"
          text="A1 承担最高识别，C16 承担小尺寸记忆点；两者不和辅助字抢位置。"
        />
        <div className="identity-grid">
          <article className="asset-card a1-card">
            <div className="asset-surface">
              <YangmingA1Mark className="asset-a1" title="阳明照见 A1 主标预览" />
            </div>
            <AssetMeta title="A1 主标" text="官网品牌位、报告封面、主视觉落款。" />
          </article>
          <article className="asset-card c16-card">
            <div className="asset-surface compact">
              <YangmingC16Mark className="asset-c16" title="阳明照见 C16 小标预览" />
            </div>
            <AssetMeta title="C16 小标" text="头像、favicon、移动端角标、小尺寸识别。" />
          </article>
          <article className="asset-card seal-card">
            <div className="tone-row">
              {toneSamples.map((item) => (
                <div key={item.label} className="tone-item">
                  <YangmingZhaoSeal label={item.label} showLabel size="sm" tone={item.tone} title={`${item.label}照印预览`} />
                  <span>{item.note}</span>
                </div>
              ))}
            </div>
            <AssetMeta title="完成盖印" text="报告生成、保存、训练完成等状态，只表达照见与沉淀。" />
          </article>
        </div>
      </section>

      <section className="preview-section" aria-label="照骨字系">
        <SectionHeading
          kicker="ZHAO BONE CHARACTERS"
          title={brandCharacterSystem.subtitle}
          text={brandCharacterSystem.principle}
        />
        <div className="character-board">
          {supportingCharacters.map((item) => (
            <article key={item.key} className={`character-preview-card tier-${item.tier}`}>
              <YangmingCharacterMark
                character={item.character}
                label={`${item.character}字资产预览，${item.role}，${item.phrase}`}
                roleText={item.role}
                size="lg"
                tier={item.tier}
              />
              <div>
                <strong>{item.phrase}</strong>
                <p>{item.usage}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="sequence-strip" aria-label="照骨字系顺序">
          {brandCharacterSequence.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </section>

      <section className="preview-section motion-section" aria-label="照骨动效语法">
        <SectionHeading
          kicker="MOTION GRAMMAR"
          title={brandMotionSystem.title}
          text={brandMotionSystem.principle}
        />
        <div className="motion-board">
          {motionSamples.map((item) => {
            const supportingCharacter = supportingCharacters.find((character) => character.character === item.character)
            const tier = supportingCharacter?.tier ?? "method"

            return (
              <article key={item.key} className="motion-card">
                <div className="motion-mark-stage">
                  {item.character === "照" ? (
                    <YangmingZhaoSeal size="sm" title="照字盖印动效预览" />
                  ) : (
                    <YangmingCharacterMark
                      character={item.character}
                      label={`${item.character}字动效，${item.motion}`}
                      roleText={item.motion}
                      size="sm"
                      tier={tier}
                    />
                  )}
                </div>
                <div>
                  <strong>{item.character} · {item.motion}</strong>
                  <p>{item.usage}</p>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="preview-section" aria-label="功能母题">
        <SectionHeading
          kicker="PRODUCT GLYPHS"
          title="功能母题只服务路径。"
          text="四个 Glyph 对应交易、复盘、训练、成长，不承担主品牌识别，也不表达交易方向。"
        />
        <div className="glyph-grid">
          {glyphSamples.map((item) => (
            <article key={item.kind} className="glyph-card">
              <YangmingGlyph className="glyph-mark" kind={item.kind} title={item.text} />
              <span>{item.label}</span>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="preview-section" aria-label="应用场景">
        <SectionHeading
          kicker="APPLICATION CHECK"
          title="放进真实物料里看。"
          text="同一套资产要在报告、分享、视频三个传播场景里保持同一口气。"
        />
        <div className="application-grid">
          <article className="mock-report">
            <YangmingZhaoSeal className="mock-report-seal" label="已照见" showLabel size="md" title="报告完成照印预览" />
            <span className="mock-label">心镜报告</span>
            <h3>冲动型</h3>
            <p>一句话照见：明知不可追，见涨仍动心。</p>
            <div className="mock-line" />
            <small>报告只照见反应模式，不判断行情方向。</small>
          </article>

          <article className="mock-share">
            <YangmingZhaoSeal
              decorative
              className="mock-share-watermark"
              size="hero"
              style={
                {
                  "--zhao-seal-color": "rgba(216, 183, 111, 0.17)",
                  "--zhao-seal-border": "rgba(216, 183, 111, 0.12)",
                  "--zhao-seal-glow": "rgba(216, 183, 111, 0.035)",
                } as CSSProperties
              }
            />
            <span className="mock-label">分享卡</span>
            <h3>一张卡，只照见此心。</h3>
            <p>分享的不是标签，而是一段正在训练的反应模式。</p>
          </article>

          <article className="mock-video">
            <div className="mock-video-frame">
              <YangmingZhaoSeal className="mock-video-seal" size="hero" title="短视频盖印照印预览" />
              <p>完成一念，盖一枚照。</p>
            </div>
            <span>9:16 短视频素材</span>
          </article>
        </div>
      </section>

      <section className="preview-section audit-section" aria-label="品牌资产体检清单">
        <SectionHeading
          kicker="ASSET AUDIT"
          title="满分靠边界，不靠堆满。"
          text="这张预览页后续就作为品牌体检板，每次新增物料先放进来对比。"
        />
        <div className="audit-grid">
          {auditItems.map((item) => (
            <div key={item} className="audit-item">
              <span aria-hidden="true">界</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
        <div className="mantra-strip" aria-label="品牌四句">
          {brandMantras.map((item) => (
            <span key={item.key}>{item.text}</span>
          ))}
        </div>
      </section>

      <footer className="preview-compliance">
        本系统仅用于交易认知、行为训练与风险教育；不荐股、不喊单、不承诺收益。
      </footer>

      <style jsx>{`
        .brand-preview-page {
          position: relative;
          min-height: 100svh;
          overflow-x: clip;
          background:
            radial-gradient(circle at 18% 8%, rgba(216, 183, 111, 0.1), transparent 28rem),
            radial-gradient(circle at 88% 42%, rgba(95, 132, 117, 0.1), transparent 30rem),
            #080807;
          color: #f4ebdd;
          padding: 1rem;
        }

        .ink-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(216, 183, 111, 0.024) 1px, transparent 1px),
            linear-gradient(90deg, rgba(216, 183, 111, 0.018) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(circle at 50% 28%, black, transparent 78%);
          opacity: 0.45;
        }

        .preview-hero,
        .preview-section,
        .preview-compliance {
          position: relative;
          z-index: 1;
          width: min(100%, 1180px);
          margin: 0 auto;
        }

        .preview-hero {
          min-height: min(760px, calc(100svh - 2rem));
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 3rem 0;
        }

        .back-link {
          position: absolute;
          left: 0;
          top: 1rem;
          font-family: var(--font-function);
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: rgba(220, 212, 195, 0.48);
          text-decoration: none;
        }

        .back-link:hover {
          color: rgba(244, 235, 221, 0.74);
        }

        .hero-lockup {
          position: absolute;
          right: 0;
          top: 0.8rem;
          display: flex;
          align-items: center;
          gap: 0.72rem;
        }

        .hero-mini-mark {
          display: grid;
          width: 2.55rem;
          height: 2.55rem;
          place-items: center;
          border: 1px solid rgba(216, 183, 111, 0.18);
          border-radius: 8px;
          color: rgba(216, 183, 111, 0.76);
          background: rgba(255, 255, 255, 0.025);
        }

        .hero-lockup p,
        .hero-lockup div > span {
          margin: 0;
          display: block;
          font-family: var(--font-function);
          font-weight: 700;
          letter-spacing: 0.15em;
        }

        .hero-lockup p {
          font-size: 0.74rem;
          color: rgba(244, 235, 221, 0.74);
        }

        .hero-lockup div > span {
          margin-top: 0.26rem;
          font-size: 0.58rem;
          color: rgba(216, 183, 111, 0.5);
        }

        .hero-grid {
          display: grid;
          align-items: center;
          gap: clamp(2rem, 7vw, 5rem);
          grid-template-columns: minmax(0, 0.92fr) minmax(320px, 0.72fr);
        }

        .eyebrow {
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: rgba(216, 183, 111, 0.64);
        }

        h1,
        h2,
        h3,
        p {
          margin: 0;
        }

        h1 {
          max-width: 8.6em;
          margin-top: 1.1rem;
          font-family: var(--font-story);
          font-size: clamp(3.1rem, 8vw, 7.4rem);
          font-weight: 300;
          line-height: 1.12;
          letter-spacing: 0.07em;
          color: rgba(244, 235, 221, 0.94);
        }

        .hero-desc {
          max-width: 38rem;
          margin-top: 1.4rem;
          font-family: var(--font-story);
          font-size: 1.06rem;
          font-weight: 300;
          line-height: 1.9;
          letter-spacing: 0.04em;
          color: rgba(220, 212, 195, 0.58);
        }

        .hero-seal-stage {
          position: relative;
          display: grid;
          width: min(100%, 360px);
          aspect-ratio: 1;
          justify-self: center;
          place-items: center;
        }

        .hero-ring {
          position: absolute;
          inset: 4%;
          border: 1px solid rgba(216, 183, 111, 0.12);
          border-radius: 50%;
          box-shadow:
            inset 0 0 0 1px rgba(216, 183, 111, 0.04),
            inset 0 0 90px rgba(0, 0, 0, 0.34);
        }

        .hero-zhao {
          width: 76%;
          height: auto;
          aspect-ratio: 1;
        }

        .preview-section {
          padding: clamp(4rem, 8vw, 7rem) 0;
          border-top: 1px solid rgba(172, 146, 83, 0.12);
        }

        .identity-grid,
        .application-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .asset-card,
        .character-preview-card,
        .motion-card,
        .glyph-card,
        .mock-report,
        .mock-share,
        .mock-video,
        .audit-item {
          border: 1px solid rgba(172, 146, 83, 0.13);
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.014)),
            rgba(0, 0, 0, 0.12);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
        }

        .asset-card {
          display: grid;
          gap: 1rem;
          min-height: 22rem;
          padding: 1rem;
        }

        .seal-card {
          align-content: space-between;
        }

        .asset-surface {
          display: grid;
          min-height: 15rem;
          place-items: center;
          border: 1px solid rgba(216, 183, 111, 0.08);
          border-radius: 8px;
          background:
            radial-gradient(circle, rgba(216, 183, 111, 0.08), transparent 62%),
            rgba(255, 255, 255, 0.018);
          color: rgba(216, 183, 111, 0.74);
        }

        .asset-surface.compact {
          color: rgba(216, 183, 111, 0.8);
        }

        :global(.asset-a1) {
          width: min(72%, 230px);
          height: auto;
        }

        :global(.asset-c16) {
          width: min(46%, 150px);
          height: auto;
        }

        .tone-row {
          display: grid;
          gap: 0.85rem;
        }

        .tone-item {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          min-height: 4.4rem;
          border: 1px solid rgba(172, 146, 83, 0.1);
          border-radius: 8px;
          padding: 0.8rem;
          background: rgba(255, 255, 255, 0.02);
        }

        .tone-item span {
          font-family: var(--font-function);
          font-size: 0.78rem;
          letter-spacing: 0.1em;
          color: rgba(220, 212, 195, 0.5);
        }

        .asset-meta h3 {
          font-family: var(--font-story);
          font-size: 1.35rem;
          font-weight: 300;
          letter-spacing: 0.06em;
          color: rgba(242, 235, 220, 0.84);
        }

        .asset-meta p {
          margin-top: 0.5rem;
          font-family: var(--font-function);
          font-size: 0.8rem;
          line-height: 1.7;
          color: rgba(220, 212, 195, 0.44);
        }

        .character-board {
          display: grid;
          gap: 0.9rem;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .character-preview-card {
          display: grid;
          gap: 1rem;
          min-height: 13rem;
          align-content: start;
          padding: 1rem;
        }

        .character-preview-card strong {
          display: block;
          font-family: var(--font-story);
          font-size: 1.2rem;
          font-weight: 300;
          letter-spacing: 0.05em;
          color: rgba(242, 235, 220, 0.82);
        }

        .character-preview-card p {
          margin-top: 0.52rem;
          font-family: var(--font-function);
          font-size: 0.76rem;
          line-height: 1.65;
          color: rgba(220, 212, 195, 0.42);
        }

        .sequence-strip,
        .mantra-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
          margin-top: 1.1rem;
        }

        .sequence-strip span,
        .mantra-strip span {
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.018);
          padding: 0.48rem 0.72rem;
          font-family: var(--font-function);
          font-size: 0.74rem;
          letter-spacing: 0.08em;
          color: rgba(220, 212, 195, 0.48);
        }

        .motion-board {
          display: grid;
          gap: 0.75rem;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .motion-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 0.9rem;
          min-height: 7.2rem;
          padding: 1rem;
        }

        .motion-mark-stage {
          display: grid;
          min-width: 3.4rem;
          place-items: center;
        }

        .motion-card strong {
          display: block;
          font-family: var(--font-story);
          font-size: 1.08rem;
          font-weight: 300;
          letter-spacing: 0.05em;
          color: rgba(242, 235, 220, 0.82);
        }

        .motion-card p {
          margin-top: 0.42rem;
          font-family: var(--font-function);
          font-size: 0.74rem;
          line-height: 1.58;
          color: rgba(220, 212, 195, 0.42);
        }

        .glyph-grid {
          display: grid;
          gap: 0.9rem;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .glyph-card {
          display: grid;
          min-height: 12rem;
          place-items: center;
          padding: 1rem;
          text-align: center;
        }

        :global(.glyph-mark) {
          width: 4.4rem;
          height: 4.4rem;
          color: rgba(216, 183, 111, 0.68);
        }

        .glyph-card span {
          font-family: var(--font-story);
          font-size: 1.2rem;
          font-weight: 300;
          color: rgba(242, 235, 220, 0.78);
        }

        .glyph-card p {
          font-family: var(--font-function);
          font-size: 0.74rem;
          line-height: 1.6;
          color: rgba(220, 212, 195, 0.42);
        }

        .mock-report,
        .mock-share,
        .mock-video {
          position: relative;
          overflow: hidden;
          min-height: 24rem;
          padding: 1.25rem;
        }

        .mock-report-seal {
          position: absolute;
          right: 1.1rem;
          top: 1.1rem;
          transform: rotate(-9deg);
        }

        .mock-label {
          display: block;
          font-family: var(--font-function);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: rgba(216, 183, 111, 0.66);
        }

        .mock-report h3,
        .mock-share h3 {
          max-width: 7em;
          margin-top: 3.4rem;
          font-family: var(--font-story);
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 300;
          line-height: 1.18;
          letter-spacing: 0.07em;
          color: rgba(244, 235, 221, 0.88);
        }

        .mock-report p,
        .mock-share p {
          margin-top: 1.2rem;
          font-family: var(--font-story);
          font-size: 0.98rem;
          font-weight: 300;
          line-height: 1.8;
          color: rgba(220, 212, 195, 0.58);
        }

        .mock-line {
          height: 1px;
          margin-top: 2rem;
          background: linear-gradient(90deg, rgba(216, 183, 111, 0.28), transparent);
        }

        .mock-report small {
          display: block;
          margin-top: 0.9rem;
          font-family: var(--font-function);
          font-size: 0.7rem;
          line-height: 1.6;
          color: rgba(220, 212, 195, 0.36);
        }

        .mock-share-watermark {
          position: absolute;
          right: -16%;
          top: 15%;
          width: 72%;
          height: auto;
          aspect-ratio: 1;
          opacity: 0.72;
        }

        .mock-share > *:not(.mock-share-watermark) {
          position: relative;
          z-index: 2;
        }

        .mock-video {
          display: grid;
          align-content: center;
          justify-items: center;
          gap: 1rem;
        }

        .mock-video-frame {
          position: relative;
          display: grid;
          width: min(100%, 180px);
          aspect-ratio: 9 / 16;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(216, 183, 111, 0.16);
          border-radius: 8px;
          background:
            radial-gradient(circle at 50% 28%, rgba(216, 183, 111, 0.14), transparent 7rem),
            linear-gradient(180deg, rgba(17, 16, 13, 0.96), rgba(8, 8, 7, 0.98));
        }

        .mock-video-seal {
          width: 68%;
          height: auto;
          aspect-ratio: 1;
        }

        .mock-video-frame p {
          position: absolute;
          left: 0.9rem;
          right: 0.9rem;
          bottom: 1.1rem;
          font-family: var(--font-story);
          font-size: 1.08rem;
          font-weight: 300;
          line-height: 1.45;
          color: rgba(244, 235, 221, 0.82);
        }

        .mock-video > span {
          font-family: var(--font-function);
          font-size: 0.78rem;
          letter-spacing: 0.12em;
          color: rgba(220, 212, 195, 0.44);
        }

        .audit-grid {
          display: grid;
          gap: 0.8rem;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .audit-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          min-height: 7.2rem;
          padding: 1rem;
        }

        .audit-item > span {
          display: grid;
          width: 2.2rem;
          height: 2.2rem;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid rgba(120, 60, 45, 0.28);
          border-radius: 8px;
          color: rgba(182, 91, 68, 0.78);
          font-family: var(--font-story);
          font-size: 1.2rem;
        }

        .audit-item p {
          font-family: var(--font-function);
          font-size: 0.8rem;
          line-height: 1.7;
          color: rgba(220, 212, 195, 0.5);
        }

        .preview-compliance {
          padding: 2rem 0 3rem;
          text-align: center;
          font-family: var(--font-function);
          font-size: 0.76rem;
          line-height: 1.8;
          color: rgba(220, 212, 195, 0.38);
        }

        @media (max-width: 980px) {
          .hero-grid,
          .identity-grid,
          .application-grid {
            grid-template-columns: 1fr;
          }

          .hero-seal-stage {
            width: min(72vw, 320px);
          }

          .character-board,
          .motion-board,
          .glyph-grid,
          .audit-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .brand-preview-page {
            padding: 0.9rem;
          }

          .preview-hero {
            min-height: auto;
            padding-top: 7.4rem;
          }

          .hero-lockup {
            left: 0;
            right: auto;
            top: 3.5rem;
          }

          .hero-grid,
          .character-board,
          .motion-board,
          .glyph-grid,
          .audit-grid {
            grid-template-columns: 1fr;
          }

          .hero-seal-stage {
            width: min(86vw, 300px);
          }

          .asset-card,
          .mock-report,
          .mock-share,
          .mock-video {
            min-height: auto;
          }

          .asset-surface {
            min-height: 12rem;
          }
        }
      `}</style>
    </main>
  )
}

function SectionHeading({ kicker, text, title }: { kicker: string; text: string; title: string }) {
  return (
    <div className="section-heading">
      <p>{kicker}</p>
      <h2>{title}</h2>
      <span>{text}</span>
      <style jsx>{`
        .section-heading {
          max-width: 48rem;
          margin-bottom: 1.4rem;
        }

        .section-heading p {
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: rgba(216, 183, 111, 0.62);
        }

        .section-heading h2 {
          margin: 0.9rem 0 0;
          font-family: var(--font-story);
          font-size: clamp(2.1rem, 5vw, 4.2rem);
          font-weight: 300;
          line-height: 1.18;
          letter-spacing: 0.07em;
          color: rgba(244, 235, 221, 0.9);
        }

        .section-heading span {
          display: block;
          max-width: 38rem;
          margin-top: 0.9rem;
          font-family: var(--font-function);
          font-size: 0.9rem;
          line-height: 1.85;
          letter-spacing: 0.04em;
          color: rgba(220, 212, 195, 0.5);
        }
      `}</style>
    </div>
  )
}

function AssetMeta({ text, title }: { text: string; title: string }) {
  return (
    <div className="asset-meta">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}
