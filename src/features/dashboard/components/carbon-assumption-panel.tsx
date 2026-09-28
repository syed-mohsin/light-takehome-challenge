import { Leaf } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import {
  type CarbonAssumption,
  CarbonAssumptionSchema,
} from '../../../domain/energy'

export function CarbonAssumptionPanel({
  value,
  onChange,
}: {
  value: CarbonAssumption | null
  onChange: (value: CarbonAssumption | null) => void
}) {
  const [factor, setFactor] = useState(value?.kgCo2ePerKwh.toString() ?? '')
  const [label, setLabel] = useState(value?.label ?? '')
  const [error, setError] = useState('')
  return (
    <Card tone="positive" className="border-positive/20 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Leaf aria-hidden="true" className="size-4 text-positive" />
        <h2 className="font-semibold">Make the carbon assumption explicit.</h2>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
        These files do not include a location or grid emissions factor. Add a
        sourced or illustrative factor to estimate the impact of your reduction
        scenario. This does not measure actual avoided emissions.
      </p>
      <form
        className="mt-5 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          const parsed = CarbonAssumptionSchema.safeParse({
            kgCo2ePerKwh: Number(factor),
            label,
          })
          if (!parsed.success) {
            setError(
              'Enter a factor above 0 and at most 2 (up to four decimals), plus a short source or assumption label.',
            )
            return
          }
          setError('')
          onChange(parsed.data)
        }}
      >
        <div>
          <label
            className="mb-1 block text-xs font-medium text-muted"
            htmlFor="carbon-factor"
          >
            kg CO₂e per kWh
          </label>
          <input
            id="carbon-factor"
            type="number"
            min="0.0001"
            max="2"
            step="0.0001"
            required
            value={factor}
            onChange={(event) => setFactor(event.target.value)}
            placeholder="Enter factor"
            className="h-11 w-40 rounded-lg border border-control-line bg-surface px-3 text-sm"
          />
        </div>
        <div className="min-w-48 flex-1">
          <label
            className="mb-1 block text-xs font-medium text-muted"
            htmlFor="carbon-label"
          >
            Source or assumption
          </label>
          <input
            id="carbon-label"
            required
            maxLength={80}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. Illustrative assumption"
            className="h-11 w-full rounded-lg border border-control-line bg-surface px-3 text-sm"
          />
        </div>
        <Button type="submit">Apply factor</Button>
        {value && (
          <Button
            variant="quiet"
            onClick={() => {
              onChange(null)
              setFactor('')
              setLabel('')
              setError('')
            }}
          >
            Clear
          </Button>
        )}
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      {value && (
        <p className="mt-3 text-xs text-positive">
          Active: {value.kgCo2ePerKwh} kg CO₂e/kWh · {value.label}
        </p>
      )}
    </Card>
  )
}
