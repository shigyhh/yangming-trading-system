"use client"

import { Suspense } from "react"

import { AmbientSound } from "@/components/home/ambient-sound"
import { HeroSection } from "@/components/home/hero-section"
import { HomeMobileScrollGuide } from "@/components/home/HomeMobileScrollGuide"
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
      <HomeMobileScrollGuide />
      <div className="pointer-events-none fixed inset-0 z-50 bg-ink [animation:entry-veil_2.8s_cubic-bezier(.22,1,.36,1)_forwards]" />
      <HomeWaterStage />
      <TopNav />
      <HeroSection />
      <StorySections />
      <AmbientSound />
    </main>
  )
}
