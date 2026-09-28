import { BatteryCharging, Lightbulb } from 'lucide-react'
import { useId } from 'react'
import type { EnergyAnalogy as EnergyComparison } from '../../../domain/insights/analogies'

export function EnergyAnalogy({
  text,
  comparison,
}: {
  text: string
  comparison: EnergyComparison
}) {
  const headingId = useId()
  const Icon = comparison.id === 'daily-led-bulbs' ? Lightbulb : BatteryCharging

  return (
    <section
      aria-labelledby={headingId}
      className="mt-5 rounded-xl border border-positive/15 bg-surface/70 p-4 sm:p-5"
    >
      <div className="flex items-center gap-2 text-positive">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <h4 id={headingId} className="text-xs font-semibold">
          Energy in everyday terms
        </h4>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        {comparison.scope}
      </p>
      <p className="mt-3 text-base font-medium leading-relaxed text-ink">
        {text}
      </p>
      <details className="mt-4 border-t border-positive/15 pt-3 text-xs text-muted">
        <summary className="w-fit cursor-pointer font-medium text-positive">
          How we calculated this
        </summary>
        <p className="mt-3 break-words font-medium leading-relaxed tabular-nums text-ink">
          {comparison.calculation}
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 leading-relaxed">
          {comparison.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      </details>
    </section>
  )
}
