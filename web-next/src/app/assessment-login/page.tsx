"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import {
  AssessmentShell,
  GlassPanel,
  PrimaryButton,
  SecondaryButton,
  StatusPill,
} from "@/features/assessment/components"
import { isMainlandPhone, sendSmsCode, verifySmsCode } from "@/features/assessment/mock-sms"
import { assessmentStorageKeys, hasSavedPhone, markSkipEntryOpeningRitualOnce, setStorage } from "@/features/assessment/storage"

export default function AssessmentLoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const phoneValid = useMemo(() => isMainlandPhone(phone), [phone])
  const codeValid = /^\d{4,6}$/.test(code)

  useEffect(() => {
    if (hasSavedPhone()) {
      markSkipEntryOpeningRitualOnce()
      router.replace("/assessment-entry")
    }
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
      setMessage("验证码已送达，填入后归档这份心证。")
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
      markSkipEntryOpeningRitualOnce()
      router.replace("/assessment-entry")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "请稍后再试。")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AssessmentShell background="home-water" contentWidth="wide">
      <div className="login-page mx-auto grid w-full max-w-[1120px] gap-6">
        <section className="login-copy">
          <div className="login-eyebrow">
            <StatusPill>心证归档</StatusPill>
          </div>
          <h1 className="login-title mt-7 max-w-[720px] font-story text-[clamp(2.62rem,5.08vw,5.05rem)] font-light leading-[1.12] tracking-[.062em]">
            <span>让此心一照，</span>
            <span>日后仍可回看。</span>
          </h1>
          <p className="mt-7 max-w-[35rem] font-story text-[1.06rem] font-light leading-9 tracking-[.035em] text-[rgba(220,212,195,.68)]">
            <span className="login-passport-key">手机号</span>
            就是你的照心通行证。网站、小程序、心证档案、训练记录与复测变化，都会归于同一账户。
          </p>
        </section>

        <GlassPanel className="login-card grid gap-5">
          <label className="grid gap-2">
            <span className="font-function text-sm font-medium text-[rgba(242,235,220,.72)]">手机号</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))}
              inputMode="tel"
              autoComplete="tel"
              placeholder="填写手机号，归档心证"
              className="min-h-13 rounded-[8px] border border-[rgba(172,146,83,.28)] bg-white/[.035] px-4 font-function text-base tracking-[.04em] text-[rgba(242,235,220,.94)] outline-none transition duration-300 placeholder:text-[rgba(220,212,195,.42)] hover:border-[rgba(180,157,93,.4)] focus:border-[rgba(216,183,111,.62)] focus:bg-white/[.055] focus:shadow-[0_0_0_1px_rgba(216,183,111,.18)]"
            />
          </label>

          <div className="grid grid-cols-[minmax(0,1fr)_124px] gap-3 sm:grid-cols-[minmax(0,1fr)_136px]">
            <label className="grid gap-2">
              <span className="font-function text-sm font-medium text-[rgba(242,235,220,.72)]">验证码</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="4-6 位"
                className="min-h-13 rounded-[8px] border border-[rgba(172,146,83,.28)] bg-white/[.035] px-4 font-function text-base tracking-[.08em] text-[rgba(242,235,220,.94)] outline-none transition duration-300 placeholder:text-[rgba(220,212,195,.42)] hover:border-[rgba(180,157,93,.4)] focus:border-[rgba(216,183,111,.62)] focus:bg-white/[.055] focus:shadow-[0_0_0_1px_rgba(216,183,111,.18)]"
              />
            </label>
            <SecondaryButton
              type="button"
              onClick={sendCode}
              disabled={!phoneValid || countdown > 0}
              className="mt-8 min-h-13 whitespace-nowrap border-[rgba(172,146,83,.34)] px-3 text-sm text-[rgba(220,212,195,.82)] enabled:hover:border-[rgba(216,183,111,.52)] enabled:hover:text-[rgba(244,235,221,.94)] sm:px-4"
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
            className="login-primary-button justify-self-center w-full max-w-[20rem] !min-h-[3.5rem] !rounded-full !bg-[linear-gradient(180deg,#dcc67c_0%,#b99d56_52%,#92743a_100%)] !px-8 !text-[0.94rem] !text-[#0b0a07] !shadow-[0_16px_34px_rgba(0,0,0,.34),0_0_18px_rgba(216,183,111,.08),inset_0_1px_0_rgba(255,255,255,.28)] enabled:hover:!brightness-110 enabled:hover:!shadow-[0_18px_40px_rgba(0,0,0,.36),0_0_24px_rgba(216,183,111,.14),inset_0_1px_0_rgba(255,255,255,.34)] disabled:!cursor-not-allowed disabled:!opacity-[.76] disabled:!brightness-[.98] disabled:!saturate-[.95] disabled:!text-[rgba(10,10,8,.78)]"
          >
            {submitting ? "归档中..." : "进入照心 →"}
          </PrimaryButton>
        </GlassPanel>

        <p className="login-compliance">
          本系统仅用于交易心理训练与行为复盘，不预测行情，不提供买卖建议。
        </p>

        <style jsx>{`
          .login-page {
            animation: login-page-in 820ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          .login-copy {
            position: relative;
            isolation: isolate;
          }

          .login-eyebrow {
            display: flex;
            align-items: center;
          }

          .login-title {
            word-break: keep-all;
            line-break: strict;
            text-wrap: balance;
          }

          .login-title span {
            display: block;
            white-space: nowrap;
          }

          .login-passport-key {
            color: rgba(244, 235, 221, 0.86);
            text-shadow: 0 0 18px rgba(216, 183, 111, 0.08);
          }

          .login-copy::before {
            content: "";
            position: absolute;
            inset: -10% auto auto 36%;
            width: min(42vw, 390px);
            aspect-ratio: 1;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(238, 230, 210, 0.032), transparent 62%);
            filter: blur(18px);
            opacity: 0.2;
            z-index: -1;
          }

          .login-card {
            align-self: center;
          }

          .login-compliance {
            margin: 1.25rem auto 0;
            max-width: 44rem;
            text-align: center;
            font-family: var(--font-interface), sans-serif;
            font-size: 0.75rem;
            line-height: 1.8;
            letter-spacing: 0.04em;
            color: rgba(220, 212, 195, 0.5);
          }

          @media (min-width: 960px) {
            .login-page {
              grid-template-columns: minmax(0, 0.96fr) minmax(360px, 420px);
              align-items: center;
              min-height: calc(100svh - 5rem);
            }

            .login-compliance {
              grid-column: 1 / -1;
            }
          }

          @media (max-width: 520px) {
            .login-title {
              font-size: clamp(2.1rem, 11.4vw, 3.18rem);
              letter-spacing: 0.04em;
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
    </AssessmentShell>
  )
}
