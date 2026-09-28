import { CalendarDays, ChevronDown } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '../../../components/ui/button'
import {
  DEFAULT_PERIOD,
  formatDate,
  type Period,
  PeriodSchema,
} from '../../../domain/energy'

export function PeriodPicker({
  period,
  coverage,
  onChange,
}: {
  period: Period
  coverage: Period
  onChange: (period: Period) => void
}) {
  const details = useRef<HTMLDetailsElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')
  function apply(next: Period) {
    const parsed = PeriodSchema.safeParse(next)
    if (
      !parsed.success ||
      next.start < coverage.start ||
      next.end > coverage.end
    ) {
      setError(
        `Choose up to 366 days between ${formatDate(coverage.start)} and ${formatDate(coverage.end)}.`,
      )
      return
    }
    setError('')
    onChange(parsed.data)
    form.current?.reset()
    if (details.current) details.current.open = false
  }
  return (
    <details ref={details} className="relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-muted hover:border-control-line">
        <CalendarDays className="size-4" aria-hidden="true" />
        <span>
          {formatDate(period.start)} – {formatDate(period.end)}
        </span>
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </summary>
      <form
        ref={form}
        onSubmit={(event) => {
          event.preventDefault()
          const fields = new FormData(event.currentTarget)
          apply({
            start: String(fields.get('start') ?? ''),
            end: String(fields.get('end') ?? ''),
          })
        }}
        className="absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-4 shadow-lg"
      >
        <p className="text-sm font-semibold">Reporting period</p>
        <p className="mb-4 mt-1 text-xs text-muted">
          Explore up to one year of historical data.
        </p>
        <label
          className="block text-xs font-medium text-muted"
          htmlFor="period-start"
        >
          From
        </label>
        <input
          id="period-start"
          name="start"
          className="mt-1 w-full rounded-lg border border-control-line bg-surface p-2 text-sm"
          type="date"
          min={coverage.start}
          max={coverage.end}
          defaultValue={period.start}
          required
        />
        <label
          className="mt-3 block text-xs font-medium text-muted"
          htmlFor="period-end"
        >
          Through
        </label>
        <input
          id="period-end"
          name="end"
          className="mt-1 w-full rounded-lg border border-control-line bg-surface p-2 text-sm"
          type="date"
          min={coverage.start}
          max={coverage.end}
          defaultValue={period.end}
          required
        />
        {error && (
          <p role="alert" className="mt-3 text-xs text-danger">
            {error}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="quiet" onClick={() => apply(DEFAULT_PERIOD)}>
            Sample year
          </Button>
          <Button type="submit">Apply dates</Button>
        </div>
      </form>
    </details>
  )
}
