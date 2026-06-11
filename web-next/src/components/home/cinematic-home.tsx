"use client"

import { Suspense } from "react"

import { AmbientSound } from "@/components/home/ambient-sound"
import { HeroSection } from "@/components/home/hero-section"
import { HomeWaterStage } from "@/components/home/HomeWaterStage"
import { StorySections } from "@/components/home/story-sections"
import { TopNav } from "@/components/home/top-nav"
import { HomeEntryGate } from "@/components/user-flow/HomeEntryGate"

export function CinematicHome() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-[var(--ym-bg-dark-ink)] text-[var(--ym-text-primary)]">
      <Suspense fallback={null}>
        <HomeEntryGate />
      </Suspense>
      <div className="pointer-events-none fixed inset-0 z-50 bg-ink [animation:entry-veil_2.8s_cubic-bezier(.22,1,.36,1)_forwards]" />
      <HomeWaterStage />
      <TopNav />
      <HeroSection />
      <StorySections />
      <footer
        id="compliance"
        className="font-function pointer-events-none sticky bottom-[max(.75rem,env(safe-area-inset-bottom))] z-10 mx-auto mt-24 w-full max-w-[1240px] px-4 pb-1 text-center text-[11px] leading-5 text-[rgba(220,212,195,.32)] md:px-8 md:text-xs md:leading-6"
      >
        <p>本系统仅用于交易认知、行为训练与风险教育；</p>
        <p>不荐股、不喊单、不承诺收益。</p>
      </footer>
      <AmbientSound />
    </main>
  )
}
