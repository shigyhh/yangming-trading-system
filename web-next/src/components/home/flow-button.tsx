"use client"

import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import type { MouseEvent, ReactNode } from "react"
import { useState } from "react"

import { cn } from "@/lib/utils"

type FlowButtonProps = {
  href: string
  children: ReactNode
  variant?: "primary" | "ghost"
  className?: string
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
  }

  return (
    <motion.a
      href={href}
      onClick={handleClick}
      whileTap={{ y: 2, scale: 0.992 }}
      className={cn(
        "ritual-pressable group relative inline-flex min-h-12 items-center justify-center overflow-hidden rounded-full px-6 text-sm font-medium no-underline outline-none transition duration-700 focus-visible:ring-2 focus-visible:ring-primary/50 md:min-h-[52px] md:px-7",
        "type-level-5",
        variant === "primary"
          ? "bg-[linear-gradient(180deg,rgba(227,199,126,.78),rgba(189,150,80,.78))] text-primary-foreground opacity-84 shadow-[inset_0_1px_0_rgba(255,255,255,.11),0_10px_24px_rgba(216,183,111,0.045)] hover:opacity-96 hover:shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_13px_34px_rgba(216,183,111,.09)]"
          : "border border-[rgba(217,189,122,.1)] bg-[rgba(8,8,7,.1)] text-[rgba(244,235,221,.64)] shadow-[inset_0_1px_0_rgba(255,255,255,.018)] backdrop-blur-xl hover:border-[rgba(217,189,122,.2)] hover:text-[rgba(244,235,221,.84)]",
        className
      )}
    >
      <motion.span
        className="pointer-events-none absolute inset-[1px] rounded-full border border-[rgba(255,255,255,.16)]"
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
          className="pointer-events-none absolute z-20 size-1 rounded-full bg-[#f8df9d] shadow-[0_0_10px_rgba(216,183,111,.5)]"
          initial={{ x: spark.x, y: spark.y, opacity: 0.55, scale: 0.82 }}
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
