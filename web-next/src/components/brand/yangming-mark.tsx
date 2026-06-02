import type { SVGProps } from "react"

import { cn } from "@/lib/utils"

type BrandSvgProps = SVGProps<SVGSVGElement> & {
  title?: string
}

export function YangmingA1Mark({ className, title = "阳明照见 A1 主标", ...props }: BrandSvgProps) {
  return (
    <svg
      viewBox="0 0 280 260"
      role="img"
      aria-label={title}
      className={cn("yangming-mark yangming-mark-a1", className)}
      {...props}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M55 40H119V123H55Z" strokeWidth="9" />
        <path d="M68 68H107M68 96H107" strokeWidth="5" opacity=".72" />
        <path d="M154 42H214" strokeWidth="9" />
        <path d="M184 44C180 68 167 88 146 104" strokeWidth="9" />
        <path d="M154 84H217V123H154Z" strokeWidth="9" />
        <path d="M166 104H206" strokeWidth="4.8" opacity=".7" />
        <path d="M70 151H209" strokeWidth="6.4" />
        <path
          d="M72 184C63 200 57 213 50 228M114 183C108 199 105 214 102 231M156 183C160 199 163 214 166 231M197 184C206 200 215 214 222 228"
          strokeWidth="6.6"
        />
      </g>
    </svg>
  )
}

export function YangmingC16Mark({ className, title = "阳明照见 C16 小标", ...props }: BrandSvgProps) {
  return (
    <svg
      viewBox="0 0 280 260"
      role="img"
      aria-label={title}
      className={cn("yangming-mark yangming-mark-c16", className)}
      {...props}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M58 68H116V118H58Z" strokeWidth="13" />
        <path d="M150 68H212V118H150Z" strokeWidth="13" />
        <path d="M66 150H206" strokeWidth="11" />
        <path d="M94 190L78 222M176 190L194 222" strokeWidth="11" />
      </g>
    </svg>
  )
}

type GlyphKind = "trade" | "review" | "train" | "growth"

export function YangmingGlyph({
  className,
  kind,
  title,
  ...props
}: BrandSvgProps & {
  kind: GlyphKind
}) {
  const label = title ?? glyphLabels[kind]

  return (
    <svg
      viewBox="0 0 180 180"
      role="img"
      aria-label={label}
      className={cn("yangming-glyph", className)}
      {...props}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8">
        {kind === "trade" ? (
          <>
            <path d="M30 88H150M90 42V134" />
            <circle cx="90" cy="88" r="18" />
          </>
        ) : null}
        {kind === "review" ? (
          <>
            <path d="M54 54H132V132H54Z" />
            <path d="M50 150C86 134 112 152 148 132" />
          </>
        ) : null}
        {kind === "train" ? (
          <>
            <path d="M50 64H132M58 92H140M66 120H148" />
            <path d="M144 120L154 110" />
          </>
        ) : null}
        {kind === "growth" ? (
          <>
            <path d="M42 92C66 66 116 66 140 92C116 116 66 116 42 92Z" />
            <path d="M90 136V74M90 96C72 88 68 74 70 58M90 96C112 86 118 72 116 54" />
          </>
        ) : null}
      </g>
    </svg>
  )
}

const glyphLabels: Record<GlyphKind, string> = {
  trade: "以交易照人心",
  review: "以复盘照行为",
  train: "以训练照变化",
  growth: "以活镜照成长",
}
