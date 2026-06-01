"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import {
  AssessmentShell,
  PrimaryButton,
} from "@/features/assessment/components"
import {
  assessmentStorageKeys,
  clearAssessmentDraft,
  getSavedNickname,
  getSavedPhoneTail,
  hasSavedPhone,
  setStorage,
} from "@/features/assessment/storage"

export default function AssessmentEntryPage() {
  const router = useRouter()
  const [phoneTail, setPhoneTail] = useState("")
  const [nickname, setNickname] = useState("")
  const [nicknameDraft, setNicknameDraft] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEntering, setIsEntering] = useState(false)
  const [showSealIntro, setShowSealIntro] = useState(true)

  useEffect(() => {
    const introTimer = window.setTimeout(() => setShowSealIntro(false), 2200)
    const timer = window.setTimeout(() => {
      const savedNickname = getSavedNickname()
      setPhoneTail(getSavedPhoneTail())
      setNickname(savedNickname)
      setNicknameDraft(savedNickname)
    }, 0)
    return () => {
      window.clearTimeout(introTimer)
      window.clearTimeout(timer)
    }
  }, [])

  const startAssessment = () => {
    if (isEntering) return

    setIsEntering(true)
    if (hasSavedPhone()) {
      clearAssessmentDraft()
      router.push("/assessment")
      return
    }

    const target = "/assessment-login"
    router.push(target)
  }

  const saveNickname = () => {
    const cleanName = nicknameDraft.trim().slice(0, 12)
    setNickname(cleanName)
    setNicknameDraft(cleanName)
    setStorage(assessmentStorageKeys.userNickname, cleanName)
    setIsEditingName(false)
  }

  if (showSealIntro) {
    return (
      <AssessmentShell>
        <div className="archive-transition flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center text-center">
          <div className="archive-seal" aria-hidden="true">
            <span>照</span>
          </div>
          <p className="archive-copy">此心一照，妄念自明。</p>

          <style jsx>{`
            .archive-transition {
              animation: archive-transition-out 560ms ease 1860ms forwards;
            }

            .archive-seal {
              position: relative;
              display: grid;
              width: clamp(132px, 40vw, 180px);
              height: clamp(132px, 40vw, 180px);
              place-items: center;
              border: 1px solid rgba(172, 146, 83, 0.24);
              border-radius: 999px;
              background: radial-gradient(circle, rgba(216, 183, 111, 0.1), rgba(255, 255, 255, 0.012) 58%, transparent 74%);
              box-shadow: 0 0 46px rgba(180, 157, 93, 0.075);
              opacity: 0;
              animation:
                archive-line-in 820ms cubic-bezier(0.22, 1, 0.36, 1) 360ms forwards,
                archive-seal-breathe 1600ms ease-in-out 680ms forwards;
            }

            .archive-seal::before {
              content: "";
              position: absolute;
              inset: 20px;
              border: 1px dashed rgba(220, 212, 195, 0.12);
              border-radius: inherit;
            }

            .archive-seal::after {
              content: "";
              position: absolute;
              inset: 38px;
              border-radius: inherit;
              background: rgba(216, 183, 111, 0.12);
              filter: blur(26px);
            }

            .archive-seal span {
              position: relative;
              z-index: 2;
              font-family: var(--font-world);
              font-size: clamp(3.3rem, 16vw, 4.8rem);
              font-weight: 300;
              letter-spacing: 0.16em;
              color: rgba(242, 235, 220, 0.76);
              transform: translateX(0.08em);
            }

            .archive-copy {
              margin: 28px 0 0;
              font-family: var(--font-narrative);
              font-size: clamp(1.12rem, 4.6vw, 1.42rem);
              font-weight: 300;
              letter-spacing: 0.08em;
              color: rgba(220, 212, 195, 0.62);
              opacity: 0;
              animation: archive-line-in 820ms cubic-bezier(0.22, 1, 0.36, 1) 960ms forwards;
            }

            @keyframes archive-line-in {
              from {
                opacity: 0;
                filter: blur(8px);
                transform: translateY(14px);
              }

              to {
                opacity: 1;
                filter: blur(0);
                transform: translateY(0);
              }
            }

            @keyframes archive-seal-breathe {
              0%,
              100% {
                transform: scale(1);
                border-color: rgba(172, 146, 83, 0.2);
              }

              50% {
                transform: scale(1.035);
                border-color: rgba(172, 146, 83, 0.34);
              }
            }

            @keyframes archive-transition-out {
              to {
                opacity: 0;
                filter: blur(10px);
                transform: translateY(-10px);
              }
            }
          `}</style>
        </div>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell>
      <div className="ritual-entry-first-step">
        <div className="ritual-entry-breath" aria-hidden="true" />

        <div className="ritual-heart-lamp" aria-hidden="true">
          <span>照</span>
        </div>

        <p className="ritual-line ritual-line-soft ritual-line-2">先别急着回答。</p>

        <h1 className="ritual-line ritual-line-main ritual-line-3">
          回想最近一次，
          <br />
          你没有守住自己的交易瞬间。
        </h1>

        <p className="ritual-line ritual-line-sub ritual-line-4">
          <span className="ritual-thought-emphasis">选最像你的那个念头。</span>
        </p>

        <div className="ritual-entry-action ritual-line ritual-line-5">
          {phoneTail || nickname ? (
            <div className="mb-4 grid justify-items-center gap-2">
              {isEditingName ? (
                <div className="flex w-full max-w-[260px] items-center gap-2">
                  <input
                    value={nicknameDraft}
                    onChange={(event) => setNicknameDraft(event.target.value.slice(0, 12))}
                    placeholder="换个昵称"
                    className="min-h-9 flex-1 rounded-full border border-[rgba(172,146,83,.16)] bg-black/20 px-3 text-center font-function text-sm tracking-[.04em] text-[rgba(242,235,220,.82)] outline-none placeholder:text-[rgba(220,212,195,.28)] focus:border-[rgba(180,157,93,.42)]"
                  />
                  <button
                    type="button"
                    onClick={saveNickname}
                    className="rounded-full border border-[rgba(172,146,83,.16)] px-3 py-2 font-function text-xs tracking-[.08em] text-[rgba(220,212,195,.58)] transition hover:text-[rgba(242,235,220,.86)]"
                  >
                    保存
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setIsEditingName((current) => !current)}
                className="rounded-full border border-[rgba(172,146,83,.16)] bg-[rgba(169,144,82,.055)] px-4 py-1 font-function text-xs tracking-[.1em] text-[rgba(180,157,93,.68)] transition hover:border-[rgba(180,157,93,.3)] hover:text-[rgba(216,183,111,.86)]"
              >
                {nickname || `尾号 ${phoneTail}`}
              </button>
            </div>
          ) : null}

          <PrimaryButton type="button" onClick={startAssessment} disabled={isEntering} className="w-full">
            {isEntering ? "照心将启..." : "我准备好了"}
          </PrimaryButton>

          <p className="ritual-entry-note">只为省察此心，不为评判对错。</p>
        </div>
      </div>

      <style jsx>{`
        .ritual-entry-first-step {
          position: relative;
          display: flex;
          min-height: calc(100svh - 4rem);
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: clamp(22px, 4svh, 38px) 0;
          text-align: center;
        }

        .ritual-entry-breath {
          position: absolute;
          inset: -3% -18% 0;
          z-index: -1;
          background:
            radial-gradient(circle at 50% 38%, rgba(216, 183, 111, 0.13), transparent 27%),
            radial-gradient(ellipse at 50% 70%, rgba(109, 91, 52, 0.14), transparent 43%),
            linear-gradient(180deg, transparent, rgba(7, 7, 6, 0.14) 54%, transparent);
          filter: blur(2px);
          opacity: 0.68;
          animation: ritual-entry-breathe 8s ease-in-out infinite;
          pointer-events: none;
        }

        .ritual-heart-lamp {
          position: relative;
          display: grid;
          width: clamp(128px, 38vw, 172px);
          height: clamp(128px, 38vw, 172px);
          place-items: center;
          border: 1px solid rgba(172, 146, 83, 0.22);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(216, 183, 111, 0.1), rgba(255, 255, 255, 0.014) 56%, transparent 73%);
          box-shadow: 0 0 42px rgba(180, 157, 93, 0.07);
          opacity: 0;
          animation:
            ritual-line-in 1100ms cubic-bezier(0.22, 1, 0.36, 1) 120ms forwards,
            ritual-lamp-breathe 7.2s ease-in-out 1300ms infinite;
        }

        .ritual-heart-lamp::before {
          content: "";
          position: absolute;
          inset: 19px;
          border: 1px dashed rgba(220, 212, 195, 0.11);
          border-radius: inherit;
        }

        .ritual-heart-lamp::after {
          content: "";
          position: absolute;
          inset: 38px;
          border-radius: inherit;
          background: rgba(216, 183, 111, 0.11);
          filter: blur(24px);
          animation: ritual-lamp-glow 7.2s ease-in-out 1300ms infinite;
        }

        .ritual-heart-lamp span {
          position: relative;
          z-index: 2;
          font-family: var(--font-world);
          font-size: clamp(3.2rem, 15vw, 4.6rem);
          font-weight: 300;
          letter-spacing: 0.16em;
          color: rgba(242, 235, 220, 0.72);
          transform: translateX(0.08em);
        }

        .ritual-line {
          margin: 0;
          opacity: 0;
          filter: blur(8px);
          transform: translateY(14px);
          animation: ritual-line-in 1000ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .ritual-line-soft {
          margin-top: clamp(32px, 6svh, 54px);
          font-family: var(--font-narrative);
          font-size: clamp(1.14rem, 4.5vw, 1.48rem);
          font-weight: 300;
          letter-spacing: 0.1em;
          line-height: 1.8;
          color: rgba(220, 212, 195, 0.58);
        }

        .ritual-line-main {
          margin-top: clamp(22px, 4.2svh, 40px);
          font-family: var(--font-narrative);
          font-size: clamp(1.48rem, 6.8vw, 2.36rem);
          font-weight: 300;
          letter-spacing: 0.075em;
          line-height: 1.78;
          color: rgba(242, 235, 220, 0.86);
          text-shadow: 0 0 24px rgba(216, 183, 111, 0.06);
        }

        .ritual-line-sub {
          margin-top: clamp(22px, 4.4svh, 38px);
          font-family: var(--font-narrative);
          font-size: clamp(1.06rem, 4.25vw, 1.34rem);
          font-weight: 300;
          letter-spacing: 0.07em;
          line-height: 1.9;
          color: rgba(220, 212, 195, 0.62);
        }

        .ritual-thought-emphasis {
          display: inline-block;
          margin-top: 0.35em;
          color: rgba(242, 235, 220, 0.86);
          text-shadow: 0 0 24px rgba(216, 183, 111, 0.08);
        }

        .ritual-entry-action {
          margin-top: clamp(30px, 5.2svh, 52px);
          width: 100%;
          padding-bottom: max(0px, env(safe-area-inset-bottom));
        }

        .ritual-entry-note {
          margin: 14px 0 0;
          font-family: var(--font-interface);
          font-size: 0.76rem;
          font-weight: 300;
          letter-spacing: 0.08em;
          line-height: 1.8;
          color: rgba(220, 212, 195, 0.34);
        }

        .ritual-line-2 {
          animation-delay: 1150ms;
        }

        .ritual-line-3 {
          animation-delay: 2450ms;
        }

        .ritual-line-4 {
          animation-delay: 4050ms;
        }

        .ritual-line-5 {
          animation-delay: 5650ms;
        }

        @keyframes ritual-entry-breathe {
          0%,
          100% {
            opacity: 0.56;
            transform: scale(0.98);
          }

          50% {
            opacity: 0.9;
            transform: scale(1.04);
          }
        }

        @keyframes ritual-lamp-breathe {
          0%,
          100% {
            border-color: rgba(172, 146, 83, 0.18);
            box-shadow: 0 0 34px rgba(180, 157, 93, 0.055);
            transform: scale(1);
          }

          50% {
            border-color: rgba(172, 146, 83, 0.3);
            box-shadow: 0 0 54px rgba(180, 157, 93, 0.095);
            transform: scale(1.025);
          }
        }

        @keyframes ritual-lamp-glow {
          0%,
          100% {
            opacity: 0.34;
            transform: scale(0.88);
          }

          50% {
            opacity: 0.72;
            transform: scale(1.1);
          }
        }

        @keyframes ritual-line-in {
          0% {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(14px);
          }

          100% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

      `}</style>
    </AssessmentShell>
  )
}
