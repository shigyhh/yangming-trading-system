import type { Metadata } from "next"

import { OneThoughtLakePage } from "@/features/one-thought-lake/OneThoughtLakePage"

export const metadata: Metadata = {
  title: "一念心湖 · 阳明心学交易系统",
  description: "匿名看见众人的一念，也匿名放下自己的一念。",
}

export default function Page() {
  return <OneThoughtLakePage />
}
