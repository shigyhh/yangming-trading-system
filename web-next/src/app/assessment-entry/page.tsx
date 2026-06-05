"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { YangmingA1Mark } from "@/components/brand/yangming-mark"
import {
  AssessmentShell,
  PrimaryButton,
} from "@/features/assessment/components"
import {
  assessmentStorageKeys,
  clearAssessmentDraft,
  consumeSkipEntryOpeningRitualOnce,
  getSavedNickname,
  getSavedPhoneTail,
  hasSavedPhone,
  markAssessmentGatewayOnce,
  setStorage,
} from "@/features/assessment/storage"

export default function AssessmentEntryPage() {
  const router = useRouter()
  const [phoneTail, setPhoneTail] = useState("")
  const [nickname, setNickname] = useState("")
  const [nicknameDraft, setNicknameDraft] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [showOpeningRitual, setShowOpeningRitual] = useState(() => !consumeSkipEntryOpeningRitualOnce())
  const isRoutingRef = useRef(false)

  useEffect(() => {
    router.prefetch("/assessment")
    router.prefetch("/assessment-login")

    const openingTimer = window.setTimeout(() => {
      setShowOpeningRitual(false)
    }, 2450)

    const timer = window.setTimeout(() => {
      const savedNickname = getSavedNickname()
      setPhoneTail(getSavedPhoneTail())
      setNickname(savedNickname)
      setNicknameDraft(savedNickname)
    }, 0)
    return () => {
      window.clearTimeout(openingTimer)
      window.clearTimeout(timer)
    }
  }, [router])

  const startAssessment = () => {
    if (isRoutingRef.current) return
    isRoutingRef.current = true

    const savedPhone = hasSavedPhone()
    const target = savedPhone ? "/assessment" : "/assessment-login"

    if (savedPhone) {
      clearAssessmentDraft()
      markAssessmentGatewayOnce()
    }

    router.push(target)
  }

  const saveNickname = () => {
    const cleanName = nicknameDraft.trim().slice(0, 12)
    setNickname(cleanName)
    setNicknameDraft(cleanName)
    setStorage(assessmentStorageKeys.userNickname, cleanName)
    setIsEditingName(false)
  }

  return (
    <AssessmentShell contentWidth="wide">
      {showOpeningRitual ? (
        <div className="ritual-opening-transition" aria-hidden="true">
          <div className="ritual-opening-breath" aria-hidden="true" />
          <div className="ritual-opening-water ritual-opening-water-still" aria-hidden="true" />

          <div className="ritual-still-seal" aria-hidden="true">
            <YangmingA1Mark className="ritual-seal-mark" />
          </div>

          <p className="ritual-opening-copy">此心一照，妄念自明。</p>
        </div>
      ) : (
        <div className="ritual-entry-first-step">
          <div className="ritual-entry-breath" aria-hidden="true" />

          <div className="ritual-late-seal" aria-hidden="true">
            <YangmingA1Mark className="ritual-seal-mark" />
          </div>

          <h1 className="ritual-line ritual-line-main ritual-line-1">
            回想最近一次，
            <br />
            你没有守住自己的交易瞬间。
          </h1>

          <p className="ritual-line ritual-line-soft ritual-line-2">别急着回答。</p>

          <div className="ritual-entry-action ritual-line ritual-line-3">
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

            <PrimaryButton type="button" onClick={startAssessment} className="w-full">
              照见此心
            </PrimaryButton>

            <p className="ritual-entry-note">只为省察此心，不为评判对错。</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .ritual-opening-transition {
          position: relative;
          display: flex;
          width: min(100%, 1120px);
          min-height: calc(100svh - 4rem);
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          overflow: hidden;
          padding: clamp(22px, 4svh, 38px) 0;
          text-align: center;
          animation: ritual-opening-fade-out 640ms ease 2050ms forwards;
        }

        .ritual-opening-breath {
          position: absolute;
          inset: -8% -20% 0;
          z-index: -1;
          background:
            radial-gradient(circle at 50% 35%, rgba(216, 183, 111, 0.16), transparent 28%),
            radial-gradient(ellipse at 50% 66%, rgba(109, 91, 52, 0.16), transparent 42%),
            linear-gradient(180deg, transparent, rgba(7, 7, 6, 0.18) 56%, transparent);
          filter: blur(2px);
          opacity: 0.72;
          pointer-events: none;
        }

        .ritual-opening-water {
          position: absolute;
          left: 50%;
          z-index: 0;
          bottom: 14%;
          width: min(86vw, 760px);
          height: clamp(120px, 24svh, 230px);
          border-radius: 50%;
          background:
            linear-gradient(180deg, rgba(242, 235, 220, 0.035), transparent 34%),
            radial-gradient(ellipse at 50% 12%, rgba(216, 183, 111, 0.2), rgba(95, 132, 117, 0.075) 34%, transparent 70%);
          filter: blur(18px);
          opacity: 0;
          transform: translate(-50%, 34px) scaleX(0.72);
          animation: ritual-water-rise 1450ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          pointer-events: none;
        }

        .ritual-opening-water-still {
          top: calc(50% + clamp(20px, 4.6svh, 42px));
          bottom: auto;
          width: min(88vw, 820px);
          height: clamp(150px, 26svh, 260px);
          opacity: 0;
          transform: translate(-50%, 18px) scaleX(0.7);
          animation:
            ritual-still-water-in 1320ms cubic-bezier(0.22, 1, 0.36, 1) 120ms forwards,
            ritual-still-water-breathe 6.8s ease-in-out 1480ms infinite;
        }

        .ritual-opening-water::before {
          content: "";
          position: absolute;
          left: 9%;
          right: 9%;
          top: 14%;
          height: 1px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(216, 183, 111, 0.28), rgba(244, 235, 221, 0.14), transparent);
          opacity: 0.74;
        }

        .ritual-still-seal {
          position: relative;
          z-index: 1;
          display: grid;
          width: clamp(164px, 42vw, 218px);
          height: clamp(164px, 42vw, 218px);
          place-items: center;
          border: 1px solid rgba(172, 146, 83, 0.24);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(216, 183, 111, 0.1), rgba(255, 255, 255, 0.012) 58%, transparent 75%);
          box-shadow: 0 0 58px rgba(180, 157, 93, 0.075);
          opacity: 0;
          transform: translateY(10px) scale(0.96);
        }

        .ritual-still-seal {
          width: clamp(176px, 43vw, 238px);
          height: clamp(176px, 43vw, 238px);
          border-color: rgba(172, 146, 83, 0.28);
          background:
            radial-gradient(circle, rgba(216, 183, 111, 0.18), rgba(216, 183, 111, 0.055) 42%, rgba(255, 255, 255, 0.012) 61%, transparent 76%),
            radial-gradient(circle at 50% 56%, rgba(95, 132, 117, 0.07), transparent 62%);
          box-shadow:
            0 0 74px rgba(180, 157, 93, 0.1),
            inset 0 0 38px rgba(216, 183, 111, 0.045);
          animation:
            ritual-seal-appear 980ms cubic-bezier(0.22, 1, 0.36, 1) 80ms forwards,
            ritual-still-seal-breathe 5.6s ease-in-out 1180ms infinite;
        }

        .ritual-still-seal::before {
          content: "";
          position: absolute;
          inset: 26px;
          border: 1px dashed rgba(220, 212, 195, 0.12);
          border-radius: inherit;
        }

        .ritual-still-seal::before {
          inset: 28px;
          border-color: rgba(220, 212, 195, 0.145);
        }

        .ritual-still-seal::after {
          content: "";
          position: absolute;
          inset: 46px;
          border-radius: inherit;
          background: rgba(216, 183, 111, 0.12);
          filter: blur(25px);
        }

        .ritual-still-seal::after {
          inset: 42px;
          background: rgba(216, 183, 111, 0.16);
          filter: blur(28px);
        }

        .ritual-still-seal :global(.ritual-seal-mark) {
          position: relative;
          z-index: 2;
          width: clamp(4.9rem, 17vw, 7.1rem);
          height: auto;
          color: rgba(242, 235, 220, 0.82);
          transform: translateX(0.02em);
          text-shadow: 0 0 30px rgba(216, 183, 111, 0.12);
        }

        .ritual-late-seal {
          position: absolute;
          left: 50%;
          top: clamp(34px, 6.2svh, 82px);
          display: grid;
          width: clamp(120px, 18.6vw, 160px);
          height: clamp(120px, 18.6vw, 160px);
          place-items: center;
          border: 1px solid rgba(172, 146, 83, 0.16);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(216, 183, 111, 0.08), rgba(255, 255, 255, 0.01) 58%, transparent 74%);
          box-shadow: 0 0 38px rgba(180, 157, 93, 0.052);
          opacity: 0;
          transform: translate(-50%, 18px) scale(0.96);
          animation:
            ritual-late-seal-appear 1500ms cubic-bezier(0.22, 1, 0.36, 1) 4300ms forwards,
            ritual-late-seal-breathe 6.4s ease-in-out 5800ms infinite;
          pointer-events: none;
        }

        .ritual-late-seal::before {
          content: "";
          position: absolute;
          inset: 21px;
          border: 1px dashed rgba(220, 212, 195, 0.09);
          border-radius: inherit;
        }

        .ritual-late-seal::after {
          content: "";
          position: absolute;
          inset: 36px;
          border-radius: inherit;
          background: rgba(216, 183, 111, 0.1);
          filter: blur(20px);
        }

        .ritual-late-seal :global(.ritual-seal-mark) {
          position: relative;
          z-index: 2;
          width: clamp(3rem, 8vw, 4.2rem);
          height: auto;
          color: rgba(242, 235, 220, 0.7);
          transform: translateX(0.02em);
        }

        .ritual-opening-copy {
          position: relative;
          z-index: 1;
          margin: clamp(38px, 7svh, 66px) 0 0;
          font-family: var(--font-narrative);
          font-size: clamp(1.2rem, 4.8vw, 2.18rem);
          font-weight: 300;
          letter-spacing: 0.13em;
          line-height: 1.45;
          color: rgba(220, 212, 195, 0.68);
          white-space: nowrap;
          opacity: 0;
          filter: blur(7px);
          transform: translateY(14px);
          animation: ritual-opening-copy-in 980ms cubic-bezier(0.22, 1, 0.36, 1) 720ms forwards;
        }

        .ritual-entry-first-step {
          position: relative;
          display: flex;
          width: min(100%, 1120px);
          min-height: calc(100svh - 4rem);
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          margin: 0 auto;
          overflow: hidden;
          padding: clamp(172px, 23svh, 252px) clamp(18px, 3vw, 42px) clamp(40px, 6svh, 72px);
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

        .ritual-line {
          margin: 0;
          opacity: 0;
          filter: blur(8px);
          transform: translateY(14px);
          animation: ritual-line-in 1000ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .ritual-line-soft {
          margin-top: clamp(62px, 7.2svh, 88px);
          font-family: var(--font-narrative);
          font-size: clamp(1.2rem, 4.6vw, 1.62rem);
          font-weight: 360;
          font-variation-settings: "wght" 360;
          letter-spacing: 0.065em;
          line-height: 1.7;
          color: rgba(220, 212, 195, 0.66);
        }

        .ritual-line-main {
          margin-top: clamp(58px, 6svh, 86px);
          font-family: var(--font-yangming-title), var(--font-narrative), serif;
          font-size: clamp(1.55rem, 3.18vw, 2.92rem);
          font-weight: 420;
          font-variation-settings: "wght" 420;
          letter-spacing: 0.025em;
          line-height: 1.36;
          color: rgba(242, 235, 220, 0.9);
          text-shadow: 0 0 20px rgba(216, 183, 111, 0.055);
        }

        .ritual-entry-action {
          margin-top: clamp(42px, 5.8svh, 68px);
          width: 100%;
          max-width: 380px;
          padding-bottom: max(0px, env(safe-area-inset-bottom));
        }

        @media (min-width: 960px) {
          .ritual-entry-first-step {
            min-height: calc(100svh - 5rem);
            padding-top: clamp(190px, 22svh, 258px);
            padding-inline: clamp(1rem, 3vw, 2.5rem);
          }

          .ritual-line-main {
            max-width: 16em;
          }
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

        .ritual-line-1 {
          animation-delay: 180ms;
        }

        .ritual-line-2 {
          animation-delay: 1700ms;
        }

        .ritual-line-3 {
          animation-delay: 3500ms;
        }

        @keyframes ritual-water-rise {
          0% {
            opacity: 0;
            transform: translate(-50%, 42px) scaleX(0.62);
          }

          46% {
            opacity: 0.72;
          }

          100% {
            opacity: 0.5;
            transform: translate(-50%, -6px) scaleX(1);
          }
        }

        @keyframes ritual-still-water-in {
          0% {
            opacity: 0;
            transform: translate(-50%, 32px) scaleX(0.62);
          }

          55% {
            opacity: 0.48;
          }

          100% {
            opacity: 0.36;
            transform: translate(-50%, 0) scaleX(1);
          }
        }

        @keyframes ritual-still-water-breathe {
          0%,
          100% {
            opacity: 0.34;
            transform: translate(-50%, 0) scaleX(0.98);
          }

          50% {
            opacity: 0.44;
            transform: translate(-50%, -8px) scaleX(1.04);
          }
        }

        @keyframes ritual-opening-copy-in {
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

        @keyframes ritual-seal-appear {
          0% {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(14px) scale(0.97);
          }

          100% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0) scale(1);
          }
        }

        @keyframes ritual-still-seal-breathe {
          0%,
          100% {
            opacity: 1;
            border-color: rgba(172, 146, 83, 0.24);
            box-shadow:
              0 0 62px rgba(180, 157, 93, 0.08),
              inset 0 0 34px rgba(216, 183, 111, 0.04);
            transform: translateY(0) scale(1);
          }

          50% {
            opacity: 1;
            border-color: rgba(172, 146, 83, 0.34);
            box-shadow:
              0 0 86px rgba(180, 157, 93, 0.12),
              inset 0 0 42px rgba(216, 183, 111, 0.06);
            transform: translateY(0) scale(1.018);
          }
        }

        @keyframes ritual-late-seal-appear {
          0% {
            opacity: 0;
            filter: blur(10px);
            transform: translate(-50%, 24px) scale(0.94);
          }

          100% {
            opacity: 1;
            filter: blur(0);
            transform: translate(-50%, 0) scale(1);
          }
        }

        @keyframes ritual-late-seal-breathe {
          0%,
          100% {
            opacity: 0.78;
            border-color: rgba(172, 146, 83, 0.14);
            box-shadow: 0 0 34px rgba(180, 157, 93, 0.045);
            transform: translate(-50%, 0) scale(1);
          }

          50% {
            opacity: 0.94;
            border-color: rgba(172, 146, 83, 0.24);
            box-shadow: 0 0 48px rgba(180, 157, 93, 0.075);
            transform: translate(-50%, 0) scale(1.016);
          }
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

        @keyframes ritual-opening-fade-out {
          100% {
            opacity: 0;
            filter: blur(10px);
            transform: translateY(-8px);
          }
        }

      `}</style>
    </AssessmentShell>
  )
}
