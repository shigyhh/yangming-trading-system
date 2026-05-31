"use client"

import { motion } from "framer-motion"

const candles = [
  [42, 72, 50, 64],
  [60, 94, 72, 82],
  [68, 102, 44, 58],
  [56, 86, 61, 78],
  [76, 118, 90, 108],
  [108, 138, 82, 96],
  [90, 116, 96, 112],
  [112, 148, 88, 104],
  [100, 132, 68, 78],
  [74, 104, 78, 96],
  [92, 126, 86, 118],
  [116, 154, 106, 144],
  [142, 176, 112, 128],
  [124, 158, 98, 110],
  [108, 140, 114, 132],
]

export function KLineSpirit() {
  return (
    <motion.svg
      viewBox="0 0 760 260"
      className="absolute inset-x-0 bottom-0 h-28 w-full opacity-[.09] blur-[2.2px] md:h-64 md:opacity-[.18] md:blur-[1.2px]"
      aria-hidden="true"
      animate={{ y: [1, -1, 1] }}
      transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <filter id="goldGlow">
          <feGaussianBlur stdDeviation="2.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M0 202 C 120 170, 160 216, 260 180 S 420 130, 520 170 S 650 235, 760 158"
        fill="none"
        stroke="rgba(229,193,124,.09)"
        strokeWidth="1.6"
      />
      {candles.map(([open, high, low, close], index) => {
        const x = 40 + index * 48
        const y1 = 220 - high
        const y2 = 220 - low
        const top = 220 - Math.max(open, close)
        const height = Math.abs(open - close) || 8
        const isUp = close >= open

        return (
          <motion.g
            key={`${x}-${index}`}
            filter="url(#goldGlow)"
            animate={{ opacity: [0.18, 0.36, 0.18] }}
            transition={{
              duration: 12,
              repeat: Infinity,
              delay: index * 0.08,
              ease: "easeInOut",
            }}
          >
            <line
              x1={x}
              x2={x}
              y1={y1}
              y2={y2}
              stroke="rgba(229,193,124,.16)"
              strokeWidth="1.4"
            />
            <rect
              x={x - 8}
              y={top}
              width="16"
              height={height}
              rx="2"
              fill={isUp ? "rgba(229,193,124,.2)" : "rgba(95,132,117,.18)"}
            />
          </motion.g>
        )
      })}
    </motion.svg>
  )
}
