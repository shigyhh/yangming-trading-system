"use client"

import { motion } from "framer-motion"

const personalities = [
  ["冲动型", "追涨杀跌"],
  ["扛单型", "不止损死扛"],
  ["完美型", "等完美点位"],
  ["赌徒型", "重仓梭哈"],
  ["从众型", "消息依赖"],
  ["偏执型", "看对不敢做"],
  ["拖延型", "该动不动"],
  ["焦虑型", "盘中心乱"],
  ["平衡型", "守规复盘"],
]

export function PersonalityGrid() {
  return (
    <section
      id="personality"
      className="cinema-panel relative z-10 mx-auto min-h-[88vh] w-full max-w-[1240px] px-4 py-28 md:px-8"
    >
      <motion.div
        className="max-w-3xl"
        initial={{ opacity: 0, y: 42 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.35 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 className="font-worldview text-4xl font-medium leading-tight text-cream md:text-7xl">
          九型交易人格，
          <br />
          不是标签，是训练入口。
        </h2>
        <p className="font-story mt-7 text-lg leading-9 text-muted-cream">
          每一种人格都对应一种临盘惯性。测评不是为了给人贴标签，而是找到最该训练的那个动作。
        </p>
      </motion.div>

      <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-9">
        {personalities.map(([name, desc], index) => (
          <motion.article
            key={name}
            className="group min-h-28 rounded-2xl border border-[rgba(244,235,221,.1)] bg-[rgba(17,16,13,.62)] p-4 backdrop-blur-xl transition duration-300 hover:border-[rgba(217,189,122,.34)] hover:bg-[rgba(217,189,122,.08)]"
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.22 }}
            transition={{ duration: 0.62, delay: index * 0.035, ease: "easeOut" }}
          >
            <span className="font-function text-xs text-gold">{String(index + 1).padStart(2, "0")}</span>
            <strong className="font-worldview mt-5 block text-lg font-normal text-cream">{name}</strong>
            <p className="font-story mt-2 text-sm text-muted-cream">{desc}</p>
          </motion.article>
        ))}
      </div>
    </section>
  )
}
