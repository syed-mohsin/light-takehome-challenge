import '@tanstack/react-start/server-only'
import { sumEnergy } from '../../domain/energy/aggregation'
import { calculateFacts } from '../../domain/energy/facts'
import {
  type EnergyRequest,
  EnergyRequestSchema,
  type EnergyWindow,
} from '../../domain/energy/schema'
import { energyRegistry } from '../../generated/energy/registry.server'

export class InvalidPeriodError extends Error {
  readonly code = 'invalid-period'
}

export function loadEnergyWindow(input: EnergyRequest): EnergyWindow {
  const request = EnergyRequestSchema.parse(input)
  const artifact = energyRegistry[request.household]
  if (
    request.start < artifact.coverage.start ||
    request.end > artifact.coverage.end
  )
    throw new InvalidPeriodError(
      `Choose dates from ${artifact.coverage.start} through ${artifact.coverage.end}.`,
    )
  const inPeriod = (date: string) =>
    date >= request.start && date <= request.end
  const dayHours = artifact.dayHours.filter((bucket) => inPeriod(bucket.date))
  const completeDates = artifact.completeDates.filter(inPeriod)
  const partialDates = artifact.partialDates.filter(inPeriod)
  const offsetTransitions = artifact.offsetTransitions.filter((transition) =>
    inPeriod(transition.after.slice(0, 10)),
  )
  const window: EnergyWindow = {
    dataVersion: artifact.dataVersion,
    household: request.household,
    period: {
      start: request.start,
      end: request.end,
      observedDays: new Set(dayHours.map((bucket) => bucket.date)).size,
    },
    dayHours,
    totals: sumEnergy(dayHours),
    quality: {
      coverage: artifact.coverage,
      completeDates,
      partialDates,
      intervalCount: dayHours.reduce(
        (sum, bucket) => sum + bucket.intervalCount,
        0,
      ),
      offsetTransitions,
      notes: [
        'Dates and hours use the original meter offsets, not your device timezone.',
        ...(offsetTransitions.length
          ? [
              'Continuous UTC intervals include source offset changes; shorter and repeated local hours retain their measured energy.',
            ]
          : []),
        ...(partialDates.length
          ? ['The selected period includes partial source boundary days.']
          : []),
      ],
    },
    facts: [],
  }
  window.facts = calculateFacts(window)
  return window
}
