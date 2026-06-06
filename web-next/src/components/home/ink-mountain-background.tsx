"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

import { ZenSceneCanvas } from "@/components/home/zen-scene-canvas"

const particles = [
  { left: "8%", top: "22%" },
  { left: "27%", top: "76%" },
  { left: "58%", top: "15%" },
  { left: "82%", top: "48%" },
  { left: "93%", top: "24%" },
].map((particle, index) => ({
  ...particle,
  id: index,
  delay: (index % 5) * 1.25,
  scale: 0.32 + (index % 3) * 0.1,
}))

export function InkMountainBackground() {
  const [response, setResponse] = useState({ active: false, id: 0, x: 0.5, y: 0.5 })

  useEffect(() => {
    let timer = 0

    function handleMindRipple(event: Event) {
      const detail = (event as CustomEvent<{ x: number; y: number }>).detail
      window.clearTimeout(timer)
      setResponse((current) => ({
        active: true,
        id: current.id + 1,
        x: detail?.x ?? 0.5,
        y: detail?.y ?? 0.5,
      }))
      timer = window.setTimeout(() => {
        setResponse((current) => ({ ...current, active: false }))
      }, 1250)
    }

    window.addEventListener("mind-ripple", handleMindRipple)

    return () => {
      window.removeEventListener("mind-ripple", handleMindRipple)
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[var(--ym-bg-deep-lake)]">
      <ZenSceneCanvas />
      <motion.div
        key={response.id}
        aria-hidden="true"
        className="absolute h-[44vh] w-[44vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(216,183,111,.032),rgba(95,132,117,.014)_36%,transparent_68%)] blur-3xl"
        style={{ left: `${response.x * 100}%`, top: `${response.y * 100}%` }}
        initial={{ opacity: 0, scale: 0.76 }}
        animate={{ opacity: response.active ? [0, 0.14, 0] : 0, scale: [0.82, 1.08, 1.2] }}
        transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        key={`mist-${response.id}`}
        aria-hidden="true"
        className="absolute bottom-[10vh] h-[22vh] w-[54vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(244,235,221,.026),rgba(216,183,111,.018)_36%,transparent_72%)] blur-3xl"
        style={{ left: `${response.x * 100}%` }}
        initial={{ opacity: 0, scaleX: 0.72, scaleY: 0.78, y: 10 }}
        animate={{
          opacity: response.active ? [0, 0.1, 0] : 0,
          scaleX: [0.74, 1.12, 1.22],
          scaleY: [0.72, 0.88, 0.82],
          y: [8, -2, 0],
        }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="absolute inset-[-12%] bg-[radial-gradient(circle_at_24%_16%,rgba(216,183,111,.035),transparent_24rem),radial-gradient(circle_at_82%_12%,rgba(95,132,117,.08),transparent_26rem),radial-gradient(circle_at_54%_86%,rgba(120,60,45,.08),transparent_28rem)]"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 0.68, 0.56, 0.68],
          x: ["-.8%", ".8%", "-.8%"],
          y: ["0%", "-.55%", "0%"],
        }}
        transition={{
          opacity: { duration: 2.4, delay: 0.45, ease: [0.22, 1, 0.36, 1] },
          x: { duration: 18, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 18, repeat: Infinity, ease: "easeInOut" },
        }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute inset-x-[-12vw] top-[6vh] h-[54vh] opacity-[.048] blur-[1.8px]"
        style={{
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 18%, #000 58%, transparent 96%)",
          maskImage: "linear-gradient(180deg, transparent 0%, #000 18%, #000 58%, transparent 96%)",
        }}
        initial={{ opacity: 0, y: "1.5vh" }}
        animate={{ opacity: [0.026, 0.048, 0.032], x: ["-.45vw", ".45vw", "-.45vw"], y: ["0vh", "-.28vh", "0vh"] }}
        transition={{
          opacity: { duration: 30, repeat: Infinity, ease: "easeInOut" },
          x: { duration: 30, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 30, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <svg className="h-full w-[116vw]" viewBox="0 0 1440 420" preserveAspectRatio="none">
          <path
            d="M0 308C94 274 150 214 233 232c88 19 128-88 222-98 108-12 151 92 260 68 72-16 128-103 222-78 82 22 110 104 216 78 88-22 130-82 287-54v272H0Z"
            fill="rgba(244,235,221,.62)"
          />
          <path
            d="M0 352C110 310 176 286 260 300c108 18 145-70 250-67 107 3 156 72 258 48 95-22 144-87 260-62 118 26 164 91 412 52v149H0Z"
            fill="rgba(95,132,117,.48)"
          />
        </svg>
      </motion.div>
      <motion.div
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,7,.12),rgba(8,8,7,.86))]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="absolute left-[-18%] top-[18%] h-px w-[136%] rotate-[-9deg] bg-[linear-gradient(90deg,transparent,rgba(216,183,111,.025),rgba(216,183,111,.12),rgba(95,132,117,.04),transparent)] blur-[1px]"
        initial={{ opacity: 0, x: "-12%" }}
        animate={{ opacity: [0, 0.36, 0.18, 0.36], x: ["-5%", "5%", "-5%"] }}
        transition={{
          opacity: { duration: 2.6, delay: 0.9, ease: [0.22, 1, 0.36, 1] },
          x: { duration: 18, repeat: Infinity, ease: "easeInOut" },
        }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute inset-x-[-14vw] bottom-0 h-[58vh] opacity-[.16]"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse 82% 64% at 50% 78%, #000 0%, rgba(0,0,0,.58) 44%, transparent 82%)",
          maskImage:
            "radial-gradient(ellipse 82% 64% at 50% 78%, #000 0%, rgba(0,0,0,.58) 44%, transparent 82%)",
        }}
        initial={{ opacity: 0, y: "2vh" }}
        animate={{ opacity: 0.16, x: ["-.65vw", ".65vw", "-.65vw"], y: ["0vh", "-.42vh", "0vh"] }}
        transition={{
          opacity: { duration: 2.4, delay: 0.18, ease: [0.22, 1, 0.36, 1] },
          x: { duration: 30, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 30, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <svg className="h-full w-[112vw]" viewBox="0 0 1440 620" preserveAspectRatio="none">
          <motion.path
            d="M0 620V392c92-44 151-26 220-96 67-68 108-146 198-96 65 36 92 128 171 98 73-28 96-124 184-139 98-16 134 118 239 100 72-12 103-87 186-76 88 11 119 98 242 54v383H0Z"
            fill="rgba(95,132,117,.12)"
            animate={{ opacity: [0.18, 0.32, 0.18], scaleY: [0.994, 1.006, 0.994] }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "50% 100%" }}
          />
          <motion.path
            d="M0 620V464c88-46 170-25 244-62 84-42 121-126 221-89 74 28 82 105 177 91 103-16 123-111 229-117 121-6 150 92 271 85 96-6 168-78 298-44v292H0Z"
            fill="rgba(8,8,7,.58)"
            stroke="rgba(217,189,122,.018)"
            strokeWidth="1.2"
            animate={{ opacity: [0.36, 0.52, 0.36], scaleY: [1.004, 0.996, 1.004] }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: -2 }}
            style={{ transformOrigin: "50% 100%" }}
          />
          {[
            "M-70 518C128 476 240 552 424 510s306-64 506-28 334 9 580-50",
            "M-90 560C132 522 272 592 472 548s330-62 516-26 306 20 542-36",
            "M-60 596C178 556 310 612 520 584s330-34 506-8 286 12 490-26",
          ].map((path, index) => (
            <motion.path
              key={path}
              d={path}
              fill="none"
              stroke={index === 1 ? "rgba(95,132,117,.08)" : "rgba(216,183,111,.09)"}
              strokeLinecap="round"
              strokeWidth={index === 2 ? 1 : 1.5}
              strokeDasharray="38 90"
              animate={{ strokeDashoffset: [0, index === 1 ? 256 : -256] }}
              transition={{
                duration: 26 + index * 7,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </svg>
      </motion.div>
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute size-1 rounded-full bg-[#d8b76f]/24 shadow-[0_0_18px_rgba(216,183,111,.1)]"
          style={{ left: particle.left, top: particle.top }}
          initial={{ opacity: 0 }}
          animate={{
            y: [-8, 12, -8],
            opacity: [0.05, 0.28, 0.05],
            scale: [particle.scale, particle.scale + 0.36, particle.scale],
          }}
          transition={{
            duration: 6 + (particle.id % 3),
            repeat: Infinity,
            delay: 1.2 + particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}
