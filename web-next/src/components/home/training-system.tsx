"use client"

import { Brain, Compass, Eye, ShieldCheck, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const layers = [
  { icon: Eye, title: "交易场景", desc: "把追涨、回撤、踏空、亏损后的真实场景拆出来。" },
  { icon: Brain, title: "情绪触发", desc: "记录心动、恐惧、急躁、证明自己的那一刻。" },
  { icon: Sparkles, title: "行为偏差", desc: "定位重复犯错的动作，不停留在笼统反省。" },
  { icon: Compass, title: "心学解释", desc: "用格物、诚意、正心解释临盘失守。" },
  { icon: ShieldCheck, title: "训练动作", desc: "把知道的原则，变成下一次能执行的微动作。" },
]

export function TrainingSystem() {
  return (
    <section
      id="training"
      className="cinema-panel relative z-10 mx-auto w-full max-w-[1240px] px-4 py-28 md:px-8"
    >
      <div className="grid gap-12 lg:grid-cols-[.86fr_1.14fr] lg:items-end">
        <motion.div
          initial={{ opacity: 0, y: 42 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.35 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="font-worldview text-4xl font-medium leading-tight text-cream md:text-7xl">
            五层训练系统：
            <br />
            不是预测，是执行。
          </h2>
          <p className="font-story mt-7 text-lg leading-9 text-muted-cream">
            训练系统会把交易行为拆成触发、念头、反应、规则、复盘五层。每一次训练，都回到“知行合一”。
          </p>
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-2">
          {layers.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.24 }}
              transition={{ duration: 0.62, delay: index * 0.05, ease: "easeOut" }}
              className={index === 4 ? "sm:col-span-2" : undefined}
            >
              <Card className="h-full rounded-2xl border-[rgba(217,189,122,.16)] bg-[rgba(17,16,13,.58)] text-cream shadow-none backdrop-blur-xl">
                <CardHeader>
                  <item.icon className="text-gold" aria-hidden="true" />
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-8 text-muted-cream">
                    {item.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
