"use client"

import { FlowButton } from "@/components/home/flow-button"

const YMTY_ENTRY_HREF = "/hd/ymty/index.html"

export function YmtyEntryCard() {
  return (
    <section
      id="ymty-entry"
      aria-labelledby="ymty-entry-title"
      className="relative z-20 mx-auto -mt-10 w-full max-w-[1240px] px-4 pb-12 sm:-mt-14 md:px-8 md:pb-16 lg:-mt-20"
    >
      <div className="relative overflow-hidden rounded-lg border border-[rgba(217,189,122,.18)] bg-[linear-gradient(135deg,rgba(17,16,13,.72),rgba(5,8,7,.48)_58%,rgba(95,132,117,.13))] px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,.26),inset_0_1px_0_rgba(244,235,221,.06)] backdrop-blur-xl sm:px-7 sm:py-6 md:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(216,183,111,.14),transparent_32%),radial-gradient(circle_at_92%_100%,rgba(95,132,117,.14),transparent_34%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(216,183,111,.62),transparent)] opacity-60" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0 space-y-3">
            <p className="font-function text-xs tracking-[.24em] text-[rgba(216,183,111,.72)] uppercase">
              公开体验入口
            </p>
            <div className="space-y-2">
              <h2
                id="ymty-entry-title"
                className="font-story text-[clamp(1.65rem,5vw,2.65rem)] leading-[1.12] font-semibold text-[rgba(244,235,221,.96)]"
              >
                7天阳明心学交易体验营
              </h2>
              <p className="font-function max-w-2xl text-sm leading-7 text-[rgba(244,235,221,.68)] sm:text-base">
                用照心、停顿、取证、复盘，训练交易纪律
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-stretch">
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
              <span className="font-function rounded-md border border-[rgba(217,189,122,.16)] bg-[rgba(8,8,7,.38)] px-3 py-2 text-center text-xs text-[rgba(244,235,221,.76)]">
                7天直播训练
              </span>
              <span className="font-function rounded-md border border-[rgba(217,189,122,.18)] bg-[rgba(216,183,111,.10)] px-3 py-2 text-center text-xs text-[rgba(244,235,221,.86)]">
                体验价 ¥1.68
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-3 sm:items-end">
              <FlowButton href={YMTY_ENTRY_HREF} className="w-full sm:w-auto">
                查看课程与报名
              </FlowButton>
              <p className="font-function text-xs leading-5 text-[rgba(244,235,221,.46)]">
                不荐股、不喊单、不承诺收益
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
