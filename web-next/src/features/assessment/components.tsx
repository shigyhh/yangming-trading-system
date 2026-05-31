"use client"

import Link from "next/link"
import type { ButtonHTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

export function AssessmentShell({
  children,
  className,
  contentWidth = "default",
}: {
  children: ReactNode
  className?: string
  contentWidth?: "default" | "wide"
}) {
  return (
    <main
      className={cn(
        "assessment-shell relative min-h-svh overflow-hidden bg-[#050504] px-5 py-8 text-[rgba(242,235,220,.92)] md:px-8 md:py-10",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(180,157,93,.14),transparent_32%),radial-gradient(circle_at_50%_86%,rgba(150,124,63,.12),transparent_34%),linear-gradient(180deg,#060606_0%,#050504_100%)]" />
      <div className="assessment-glow assessment-glow-top" />
      <div className="assessment-glow assessment-glow-bottom" />
      <div
        className={cn(
          "relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] w-full flex-col justify-center md:min-h-[calc(100svh-5rem)]",
          contentWidth === "wide" ? "max-w-none" : "max-w-[430px]",
        )}
      >
        {children}
      </div>
    </main>
  )
}

export function PrimaryLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "ritual-pressable inline-flex min-h-14 items-center justify-center rounded-full bg-[linear-gradient(180deg,#b49d5d,#967c3f)] px-7 text-center font-function text-[0.96rem] font-semibold tracking-[.12em] text-[#0c0b08] no-underline shadow-[0_18px_42px_rgba(0,0,0,.36),inset_0_1px_0_rgba(255,255,255,.24)] transition duration-300 hover:brightness-110 active:scale-[.985] active:opacity-90",
        className,
      )}
    >
      {children}
    </Link>
  )
}

export function SecondaryLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "ritual-pressable inline-flex min-h-14 items-center justify-center rounded-full border border-[rgba(164,138,78,.26)] bg-black/20 px-7 text-center font-function text-[0.96rem] font-medium tracking-[.08em] text-[rgba(220,214,200,.76)] no-underline shadow-[0_12px_30px_rgba(0,0,0,.38)] transition duration-300 hover:border-[rgba(184,155,89,.42)] hover:text-[rgba(237,229,211,.92)] hover:brightness-110 active:scale-[.985] active:opacity-90",
        className,
      )}
    >
      {children}
    </Link>
  )
}

export function PrimaryButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "ritual-pressable inline-flex min-h-14 items-center justify-center rounded-full bg-[linear-gradient(180deg,#b49d5d,#967c3f)] px-7 text-center font-function text-[0.96rem] font-semibold tracking-[.12em] text-[#0c0b08] shadow-[0_18px_42px_rgba(0,0,0,.36),inset_0_1px_0_rgba(255,255,255,.24)] transition duration-300 enabled:hover:brightness-110 enabled:active:scale-[.985] enabled:active:opacity-90 disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "ritual-pressable inline-flex min-h-14 items-center justify-center rounded-full border border-[rgba(164,138,78,.26)] bg-black/20 px-7 text-center font-function text-[0.96rem] font-medium tracking-[.08em] text-[rgba(220,214,200,.76)] shadow-[0_12px_30px_rgba(0,0,0,.38)] transition duration-300 enabled:hover:border-[rgba(184,155,89,.42)] enabled:hover:text-[rgba(237,229,211,.92)] enabled:hover:brightness-110 enabled:active:scale-[.985] enabled:active:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function ComplianceNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 rounded-[8px] border border-[rgba(172,146,83,.14)] bg-white/[.025] px-4 py-3 text-center font-function text-xs leading-6 tracking-[.04em] text-[rgba(220,212,195,.46)]">
      {children}
    </p>
  )
}

export function GlassPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[8px] border border-[rgba(172,146,83,.18)] bg-white/[.035] p-5 shadow-[0_28px_80px_rgba(0,0,0,.32)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </section>
  )
}

export function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-[rgba(172,146,83,.2)] bg-[rgba(169,144,82,.08)] px-3 py-1 font-function text-xs tracking-[.08em] text-[rgba(180,157,93,.88)]">
      {children}
    </span>
  )
}
