"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import {
  AssessmentShell,
  ComplianceNote,
  GlassPanel,
  PrimaryButton,
  SecondaryButton,
  StatusPill,
} from "@/features/assessment/components"
import { isMainlandPhone, sendSmsCode, verifySmsCode } from "@/features/assessment/mock-sms"
import { assessmentStorageKeys, hasSavedPhone, setStorage } from "@/features/assessment/storage"

export default function AssessmentLoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showArchiveForm, setShowArchiveForm] = useState(false)

  const phoneValid = useMemo(() => isMainlandPhone(phone), [phone])
  const codeValid = /^\d{4,6}$/.test(code)

  useEffect(() => {
    if (hasSavedPhone()) {
      router.replace("/assessment-entry")
      return
    }

    const timer = window.setTimeout(() => setShowArchiveForm(true), 2200)
    return () => window.clearTimeout(timer)
  }, [router])

  useEffect(() => {
    if (countdown <= 0) return

    const timer = window.setTimeout(() => setCountdown((current) => current - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  const sendCode = async () => {
    setMessage("")
    try {
      await sendSmsCode(phone)
      setCountdown(60)
      setMessage("验证码已送达，填入后安放这份心证。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "请稍后再试。")
    }
  }

  const saveAndContinue = async () => {
    setMessage("")
    setSubmitting(true)

    try {
      await verifySmsCode(phone, code)
      setStorage(assessmentStorageKeys.userPhone, phone)
      setStorage(assessmentStorageKeys.phoneTail, phone.slice(-4))
      setStorage(assessmentStorageKeys.userCreatedAt, new Date().toISOString())
      router.replace("/assessment-entry")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "请稍后再试。")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AssessmentShell contentWidth="wide">
      {!showArchiveForm ? (
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
      ) : (
      <div className="login-page mx-auto grid w-full max-w-[1180px] gap-6">
        <section className="login-copy">
          <StatusPill>安放心证</StatusPill>
          <h1 className="mt-8 max-w-[10em] font-story text-[clamp(3rem,7.2vw,6.4rem)] font-light leading-[1.08] tracking-[.08em]">
            让此心一照，日后仍可回看。
          </h1>
          <p className="mt-7 max-w-[32rem] font-story text-[1.08rem] font-light leading-9 tracking-[.04em] text-[rgba(220,212,195,.66)]">
            仅以手机号，存放这一份心证。后续报告、训练记录、复测变化都会归到同一个用户。
          </p>
        </section>

        <GlassPanel className="login-card grid gap-5">
          <label className="grid gap-2">
            <span className="font-function text-sm text-[rgba(220,212,195,.68)]">手机号</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))}
              inputMode="tel"
              autoComplete="tel"
              placeholder="填写手机号，安放心证"
              className="min-h-13 rounded-[8px] border border-[rgba(172,146,83,.2)] bg-black/20 px-4 font-function text-base tracking-[.04em] text-[rgba(242,235,220,.92)] outline-none transition placeholder:text-[rgba(220,212,195,.28)] focus:border-[rgba(180,157,93,.52)]"
            />
          </label>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <label className="grid gap-2">
              <span className="font-function text-sm text-[rgba(220,212,195,.68)]">验证码</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="4-6 位"
                className="min-h-13 rounded-[8px] border border-[rgba(172,146,83,.2)] bg-black/20 px-4 font-function text-base tracking-[.08em] text-[rgba(242,235,220,.92)] outline-none transition placeholder:text-[rgba(220,212,195,.28)] focus:border-[rgba(180,157,93,.52)]"
              />
            </label>
            <SecondaryButton
              type="button"
              onClick={sendCode}
              disabled={!phoneValid || countdown > 0}
              className="mt-8 min-h-13 whitespace-nowrap px-4 text-sm"
          >
            {countdown > 0 ? `${countdown} 秒` : "获取验证码"}
          </SecondaryButton>
          </div>

          {message ? (
            <p className="rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-3 py-2 font-function text-sm leading-6 text-[rgba(220,212,195,.62)]">
              {message}
            </p>
          ) : null}

          <PrimaryButton
            type="button"
            onClick={saveAndContinue}
            disabled={!phoneValid || !codeValid || submitting}
            className="w-full"
          >
            {submitting ? "安放中..." : "进入照心 →"}
          </PrimaryButton>
        </GlassPanel>

        <ComplianceNote>
          手机号仅用于保存照见心证与复看变化。本系统不预测行情，不提供买卖建议。
        </ComplianceNote>

        <style jsx>{`
          .login-page {
            animation: login-page-in 820ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          .login-copy {
            position: relative;
            isolation: isolate;
          }

          .login-copy::before {
            content: "";
            position: absolute;
            inset: -16% auto auto 34%;
            width: min(48vw, 460px);
            aspect-ratio: 1;
            border-radius: 50%;
            background:
              repeating-radial-gradient(circle, rgba(216, 183, 111, 0.055) 0 1px, transparent 1px 18px),
              radial-gradient(circle, rgba(95, 132, 117, 0.08), transparent 62%);
            opacity: 0.62;
            z-index: -1;
          }

          .login-card {
            align-self: center;
          }

          @media (min-width: 960px) {
            .login-page {
              grid-template-columns: minmax(0, 1fr) minmax(360px, 0.46fr);
              align-items: center;
              min-height: calc(100svh - 5rem);
            }

            .login-page :global(.compliance-note) {
              grid-column: 1 / -1;
            }
          }

          @keyframes login-page-in {
            from {
              opacity: 0;
              filter: blur(8px);
              transform: translateY(18px);
            }

            to {
              opacity: 1;
              filter: blur(0);
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
      )}
    </AssessmentShell>
  )
}
