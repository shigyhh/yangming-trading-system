"use client"

import { AmbientSound } from "@/components/home/ambient-sound"
import { HeroSection } from "@/components/home/hero-section"
import { InkMountainBackground } from "@/components/home/ink-mountain-background"
import { TopNav } from "@/components/home/top-nav"
import { WaterRippleField } from "@/components/home/water-ripple-field"

export function CinematicHome() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-ink text-cream [animation:home-breath_18s_ease-in-out_infinite]">
      <div className="pointer-events-none fixed inset-0 z-50 bg-ink [animation:entry-veil_2.8s_cubic-bezier(.22,1,.36,1)_forwards]" />
      <InkMountainBackground />
      <WaterRippleField />
      <TopNav />
      <HeroSection />
      <footer
        id="compliance"
        className="font-function relative z-10 mx-auto w-full max-w-[1240px] px-4 pb-10 text-center text-sm leading-7 text-muted-cream md:px-8"
      >
        <p>本系统仅用于交易认知、行为训练与风险教育；</p>
        <p>不荐股、不喊单、不承诺收益。</p>
      </footer>
      <AmbientSound />
    </main>
  )
}
