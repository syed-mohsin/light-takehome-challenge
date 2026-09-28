import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

const tones = {
  neutral: 'bg-canvas text-muted',
  money: 'bg-accent-soft text-accent-ink',
  positive: 'bg-positive-soft text-positive',
  blue: 'bg-scenario/10 text-scenario',
} as const

type MetricCardProps = {
  label: string
  value: string
  unit?: string
  detail?: string
  icon?: ReactNode
  tone?: keyof typeof tones
  sparkline?: readonly number[]
}

export function MetricCard({
  label,
  value,
  unit,
  detail,
  icon,
  tone = 'neutral',
  sparkline,
}: MetricCardProps) {
  const maximum = sparkline?.length ? Math.max(...sparkline, 1) : 1
  return (
    <Card className="flex min-h-44 flex-col p-5 sm:min-h-48">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold text-muted">{label}</h2>
        {icon && (
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-control [&_svg]:size-4 ${tones[tone]}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-6 flex flex-wrap items-baseline gap-1.5 tabular-nums">
        <span className="text-3xl font-semibold tracking-tight text-ink">
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-muted">{unit}</span>}
      </p>
      {detail && <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>}
      {sparkline && sparkline.length > 0 && (
        <svg
          viewBox={`0 0 ${sparkline.length * 12} 26`}
          preserveAspectRatio="none"
          className={`mt-5 h-7 w-full ${tone === 'money' ? 'text-accent' : tone === 'positive' ? 'text-positive' : 'text-scenario'}`}
          aria-hidden="true"
        >
          {sparkline.map((number, index) => {
            const height = Math.max(1, (number / maximum) * 24)
            return (
              <rect
                // biome-ignore lint/suspicious/noArrayIndexKey: Decorative bars have fixed positional meaning and no state.
                key={index}
                x={index * 12}
                y={26 - height}
                width="9"
                height={height}
                rx="1.5"
                fill="currentColor"
                opacity="0.5"
              />
            )
          })}
        </svg>
      )}
    </Card>
  )
}
