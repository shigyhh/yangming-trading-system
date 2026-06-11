import Link from "next/link"

type ReturnHomeLinkProps = {
  className?: string
}

export function ReturnHomeLink({ className = "" }: ReturnHomeLinkProps) {
  return (
    <>
      <Link className={`return-home-link ${className}`} href="/" aria-label="回到首页">
        ← 回首页
      </Link>
      <style jsx>{`
        .return-home-link {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 18px);
          left: calc(env(safe-area-inset-left, 0px) + 18px);
          z-index: 80;
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          color: rgba(216, 183, 111, 0.68);
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.12em;
          line-height: 1;
          opacity: 0.88;
          padding: 0 2px;
          text-decoration: none;
          text-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
          transition:
            color 220ms ease,
            opacity 220ms ease,
            transform 220ms ease;
        }

        .return-home-link:hover {
          color: rgba(235, 219, 174, 0.9);
          opacity: 1;
          transform: translateX(-2px);
        }

        .return-home-link:focus-visible {
          border-radius: 999px;
          outline: 1px solid rgba(216, 183, 111, 0.46);
          outline-offset: 6px;
        }

        @media (max-width: 640px) {
          .return-home-link {
            top: calc(env(safe-area-inset-top, 0px) + 12px);
            left: calc(env(safe-area-inset-left, 0px) + 14px);
            min-height: 34px;
            font-size: 12px;
            letter-spacing: 0.1em;
          }
        }
      `}</style>
    </>
  )
}
