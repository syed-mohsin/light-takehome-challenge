import { ArrowUpRight, Zap } from 'lucide-react'
import type { ReactNode } from 'react'

type DashboardLayoutProps = {
  children: ReactNode
  headerActions?: ReactNode
}

export function DashboardLayout({
  children,
  headerActions,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only fixed top-3 left-3 z-50 rounded-control bg-ink px-4 py-3 text-white focus:not-sr-only"
      >
        Skip to dashboard
      </a>
      <header className="border-b border-line bg-surface/80">
        <div className="mx-auto flex max-w-360 flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <a
            href="/"
            className="inline-flex min-h-11 items-center gap-3 rounded-control text-ink"
            aria-label="Light — My energy story home"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-ink text-accent">
              <Zap
                className="size-5"
                fill="currentColor"
                strokeWidth={1.3}
                aria-hidden="true"
              />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              light<span className="text-accent">.</span>
            </span>
            <span className="ml-2 hidden border-l border-line pl-5 text-xs font-medium text-muted sm:block">
              My energy story
            </span>
          </a>
          {headerActions && (
            <div className="flex flex-wrap items-center gap-3">
              {headerActions}
            </div>
          )}
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-304 px-5 pt-9 pb-8 outline-none sm:px-8 sm:pt-12 lg:pt-14"
      >
        {children}
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-5 text-[11px] leading-5 text-muted">
          <p>
            Built from 15-minute smart-meter intervals · Historical sample
            households
          </p>
          <a
            href="https://github.com/syed-mohsin/light-takehome-challenge/blob/main/docs/data-notes.md"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-8 items-center gap-1 underline decoration-line underline-offset-4 hover:text-ink"
          >
            Data & assumptions
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </a>
        </footer>
      </main>
    </div>
  )
}
