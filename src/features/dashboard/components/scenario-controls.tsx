import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { formatEnergy, formatMoney } from '../../../domain/energy'

export function ScenarioControls({
  percentage,
  onChange,
  summary,
}: {
  percentage: number
  onChange: (percentage: number) => void
  summary: { baselineWh: number; scenarioWh: number; savedWh: number }
}) {
  return (
    <section
      id="simulation"
      aria-labelledby="simulation-title"
      className="border-t border-line bg-canvas/65 px-5 py-5 sm:px-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3
            id="simulation-title"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <SlidersHorizontal
              aria-hidden="true"
              className="size-4 text-accent-ink"
            />
            What if your evenings used less?
          </h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
            Reduce recorded consumption from 5–9 PM. A historical scenario, not
            a forecast.
          </p>
        </div>
        <Button
          variant="quiet"
          onClick={() => onChange(0)}
          disabled={percentage === 0}
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
          Reset
        </Button>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <label htmlFor="reduction-slider" className="text-sm font-medium">
          Evening reduction
        </label>
        <input
          id="reduction-slider"
          className="h-8 min-w-32 flex-1 accent-accent"
          type="range"
          min={0}
          max={30}
          step={1}
          value={percentage}
          aria-valuetext={`${percentage} percent less consumption from 5 to 9 PM`}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <div className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2">
          <input
            aria-label="Evening reduction percentage"
            className="h-10 w-12 bg-transparent text-right text-sm font-semibold tabular-nums"
            type="number"
            min={0}
            max={30}
            step={1}
            value={percentage}
            onChange={(event) => onChange(event.target.valueAsNumber)}
          />
          <span className="text-sm text-muted">%</span>
        </div>
      </div>
      <div className="mt-5 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Recorded consumption</p>
          <p className="mt-1 font-semibold tabular-nums">
            {formatEnergy(summary.baselineWh)}{' '}
            <span className="font-normal text-muted">kWh</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">With your scenario</p>
          <p className="mt-1 font-semibold tabular-nums text-scenario">
            {formatEnergy(summary.scenarioWh)}{' '}
            <span className="font-normal">kWh</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">
            Potential reduction · selected period
          </p>
          <p className="mt-1 font-semibold tabular-nums text-positive">
            {formatEnergy(summary.savedWh)} kWh{' '}
            <span className="px-1 text-muted">/</span>{' '}
            {formatMoney(summary.savedWh, 2)}
          </p>
        </div>
      </div>
      {percentage === 0 && (
        <p className="mt-3 text-xs text-muted">
          Move the slider to compare a scenario with recorded usage.
        </p>
      )}
    </section>
  )
}
