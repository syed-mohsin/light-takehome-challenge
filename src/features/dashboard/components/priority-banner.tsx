import { ArrowUpRight, Leaf, Lightbulb, PiggyBank } from 'lucide-react'
import type { Priority } from '@/domain/preferences/schema'

const priorities = {
  money: { icon: PiggyBank, eyebrow: 'Your money snapshot' },
  carbon: { icon: Leaf, eyebrow: 'Your climate snapshot' },
  learning: { icon: Lightbulb, eyebrow: 'Your energy snapshot' },
}

type PriorityBannerProps = {
  priority: Priority
  eyebrow?: string
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}

export function PriorityBanner({
  priority,
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}: PriorityBannerProps) {
  const Icon = priorities[priority].icon
  return (
    <section
      aria-label="Your priority at a glance"
      className="flex flex-wrap items-center gap-4 rounded-card bg-banner px-5 py-6 text-on-banner shadow-card sm:flex-nowrap sm:px-6"
    >
      <span
        className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent"
        aria-hidden="true"
      >
        <Icon className="size-6" strokeWidth={1.7} />
      </span>
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-[10px] font-bold tracking-[0.16em] text-on-banner/65 uppercase">
          {eyebrow ?? priorities[priority].eyebrow}
        </p>
        <h2 className="mt-2 text-lg leading-snug font-medium tracking-tight sm:text-xl">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-on-banner/75 sm:text-sm">
          {description}
        </p>
      </div>
      <button
        type="button"
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control px-2 text-xs font-semibold text-accent hover:bg-on-banner/5 focus-visible:outline-accent"
        onClick={onAction}
      >
        {actionLabel}
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </button>
    </section>
  )
}
