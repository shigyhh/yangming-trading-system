import type { Metadata } from "next"

import { OneThoughtLakePage } from "@/features/one-thought-lake/OneThoughtLakePage"

export const metadata: Metadata = {
  title: "众念心湖 · 阳明心学交易系统",
  description: "匿名看见众人的一念，也匿名放下自己的一念。",
}

export default function LakePage() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body { background: #030706; }
            .one-thought-lake-page {
              min-height: 100svh;
              overflow: hidden;
              background:
                radial-gradient(circle at 50% 38%, rgba(95,132,117,.14), transparent 42%),
                linear-gradient(180deg, #050807 0%, #08100f 48%, #020302 100%);
              color: rgba(244,235,221,.88);
              font-family: "Noto Serif SC Local", "Songti SC", serif;
            }
            .one-thought-lake-page .lake-header {
              position: relative;
              z-index: 3;
              max-width: min(58rem, calc(100vw - 2rem));
              margin: 0 auto;
              padding-top: clamp(5.6rem, 10vh, 8rem);
              text-align: center;
            }
            .one-thought-lake-page .lake-header h1 {
              margin: 0;
              font-size: clamp(4rem, 10vw, 8.8rem);
              font-weight: 300;
              letter-spacing: .08em;
              color: rgba(244,235,221,.96);
              text-shadow: 0 0 44px rgba(0,0,0,.58);
            }
            .one-thought-lake-page .lake-header p,
            .one-thought-lake-page .lake-count,
            .one-thought-lake-page .lake-compliance {
              color: rgba(220,212,195,.56);
            }
          `,
        }}
      />
      <OneThoughtLakePage />
    </>
  )
}
