import Link from "next/link"

const principles = [
  {
    title: "不预测行情",
    body: "系统只帮助你记录触发、念头、动作与复盘，不判断涨跌方向。",
  },
  {
    title: "不提供买卖建议",
    body: "所有内容都用于交易心理观察、风险觉察和行为训练，不构成任何投资建议。",
  },
  {
    title: "不承诺收益",
    body: "训练目标是看见自己、重建纪律、稳定执行，不以收益结果作为承诺。",
  },
]

export default function RiskEducationPage() {
  return (
    <main className="min-h-screen bg-[#080807] px-5 py-8 text-[#f4ebdd] md:px-8 md:py-10">
      <section className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-[960px] flex-col justify-center">
        <Link
          href="/"
          className="font-function mb-10 w-fit text-sm tracking-[.18em] text-[rgba(244,235,221,.44)] no-underline transition hover:text-[rgba(244,235,221,.72)]"
        >
          回到首页
        </Link>

        <h1 className="font-worldview mt-5 text-[clamp(3.2rem,10vw,7.2rem)] font-light leading-[1.1] tracking-[.02em] text-[rgba(244,235,221,.92)]">
          先立边界，
          <br />
          再谈修行。
        </h1>
        <p className="mt-7 max-w-[720px] text-base font-medium leading-[2.1] tracking-[.02em] text-[rgba(244,235,221,.7)] md:text-xl">
          阳明心学交易系统只做交易认知、行为训练与风险教育。它帮助你照见情绪和念头，不替你判断行情，也不替你做交易决定。
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {principles.map((item) => (
            <article
              key={item.title}
              className="rounded-[1.5rem] border border-[rgba(217,189,122,.1)] bg-[rgba(255,255,255,.025)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]"
            >
              <h2 className="font-worldview text-2xl font-light tracking-[.04em] text-[rgba(244,235,221,.88)]">
                {item.title}
              </h2>
              <p className="mt-4 text-sm leading-8 text-[rgba(244,235,221,.58)]">
                {item.body}
              </p>
            </article>
          ))}
        </div>

        <Link
          href="/#personality"
          className="ritual-pressable font-function mt-10 inline-flex min-h-12 w-full max-w-[360px] items-center justify-center rounded-full border border-[rgba(217,189,122,.16)] bg-[rgba(216,183,111,.08)] px-6 text-sm font-semibold tracking-[.16em] text-[rgba(244,235,221,.76)] no-underline md:min-h-[52px]"
        >
          进入世界观
        </Link>
      </section>
    </main>
  )
}
