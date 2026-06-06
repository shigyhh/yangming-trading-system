"use client"

import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import type { MouseEvent, MouseEventHandler, ReactNode } from "react"
import { useState } from "react"

import { cn } from "@/lib/utils"

type FlowButtonProps = {
  href: string
  children: ReactNode
  variant?: "primary" | "ghost"
  className?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
}

type Spark = {
  id: number
  x: number
  y: number
  dx: number
  dy: number
}

export function FlowButton({
  href,
  children,
  variant = "primary",
  className,
  onClick,
}: FlowButtonProps) {
  const [sparks, setSparks] = useState<Spark[]>([])

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const next = Array.from({ length: 5 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 5
      const distance = 14 + (index % 3) * 6
      return {
        id: Date.now() + index,
        x,
        y,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
      }
    })
    setSparks(next)
    window.setTimeout(() => setSparks([]), 760)
    onClick?.(event)
  }

  return (
    <motion.a
      href={href}
      onClick={handleClick}
      whileTap={{ y: 2, scale: 0.992 }}
      className={cn(
        "ritual-pressable group relative inline-flex min-h-12 items-center justify-center overflow-hidden rounded-full border px-6 text-sm font-medium no-underline outline-none transition focus-visible:ring-2 focus-visible:ring-primary/50 md:min-h-[52px] md:px-7",
        "duration-[var(--ym-motion-fade-in)] ease-[var(--ym-motion-ease-out)]",
        "type-level-5",
        variant === "primary"
          ? "border-[rgba(216,183,111,.32)] bg-[linear-gradient(180deg,rgba(216,183,111,.72),rgba(166,129,62,.7))] text-primary-foreground opacity-88 shadow-[inset_0_1px_0_rgba(255,255,255,.11),0_10px_26px_rgba(216,183,111,0.045)] hover:border-[rgba(216,183,111,.42)] hover:opacity-96 hover:shadow-[inset_0_1px_0_rgba(255,255,255,.16),0_14px_36px_rgba(216,183,111,.08)]"
          : "border-[var(--ym-border-gold-low)] bg-[rgba(5,8,7,.22)] text-[rgba(244,235,221,.64)] shadow-[inset_0_1px_0_rgba(255,255,255,.018)] backdrop-blur-xl hover:border-[rgba(217,189,122,.24)] hover:text-[rgba(244,235,221,.84)]",
        className
      )}
    >
      <motion.span
        className="pointer-events-none absolute inset-[1px] rounded-full border border-[var(--ym-border-ivory-low)]"
        animate={{ opacity: [0.18, 0.38, 0.18] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="pointer-events-none absolute inset-y-[-24%] left-0 w-1/2 -translate-x-[125%] bg-[linear-gradient(110deg,transparent,rgba(255,250,218,.62),transparent)] opacity-60 mix-blend-screen transition group-hover:animate-[gold-flow_1.9s_ease-in-out]" />
      <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition duration-500 group-hover:bg-[radial-gradient(circle_at_50%_50%,rgba(255,238,185,.13),transparent_66%)] group-hover:opacity-100" />
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
        <ArrowRight data-icon="inline-end" />
      </span>
      {sparks.map((spark) => (
        <motion.span
          key={spark.id}
          className="pointer-events-none absolute z-20 size-1 rounded-full bg-[var(--ym-accent-gold)] shadow-[0_0_10px_rgba(216,183,111,.32)]"
          initial={{ x: spark.x, y: spark.y, opacity: 0.32, scale: 0.72 }}
          animate={{
            x: spark.x + spark.dx,
            y: spark.y + spark.dy,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.92, ease: "easeOut" }}
        />
      ))}
    </motion.a>
  )
}
