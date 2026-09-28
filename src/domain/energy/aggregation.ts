import { z } from 'zod'
import { addDays, datesInPeriod, isWeekend, mondayOf } from './calendar'
import {
  type DayHour,
  type EnergyWindow,
  type Scenario,
  ScenarioSchema,
  WhSchema,
} from './schema'
import { savedWhForHour } from './simulation'

export const HistoryPointSchema = z
  .object({
    start: z.string(),
    end: z.string(),
    observedDays: z.number().int().nonnegative(),
    partial: z.boolean(),
    baselineWh: WhSchema.nullable(),
    scenarioWh: WhSchema.nullable(),
    generationWh: WhSchema.nullable(),
  })
  .strict()
export type HistoryPoint = z.infer<typeof HistoryPointSchema>
export const TypicalDayPointSchema = z
  .object({
    hour: z.number().int().min(0).max(23),
    sampleDays: z.number().int().nonnegative(),
    baselineWh: z.number().nonnegative().nullable(),
    scenarioWh: z.number().nonnegative().nullable(),
    generationWh: z.number().nonnegative().nullable(),
    baselineTotalWh: WhSchema,
    scenarioTotalWh: WhSchema,
    generationTotalWh: WhSchema,
    intervalCount: z.number().int().nonnegative(),
    hasOffsetVariation: z.boolean(),
  })
  .strict()
export type TypicalDayPoint = z.infer<typeof TypicalDayPointSchema>
export type DayType = 'all' | 'weekday' | 'weekend'

export function sumEnergy(dayHours: DayHour[]) {
  let consumptionWh = 0
  let generationWh = 0
  for (const bucket of dayHours) {
    consumptionWh += bucket.consumptionWh
    generationWh += bucket.generationWh
  }
  if (
    !Number.isSafeInteger(consumptionWh) ||
    !Number.isSafeInteger(generationWh)
  )
    throw new Error('Energy sum exceeds the supported integer range.')
  return { consumptionWh, generationWh }
}

export function getHistoryPoints(
  window: EnergyWindow,
  scenario: Scenario,
  granularity: 'daily' | 'weekly',
): HistoryPoint[] {
  ScenarioSchema.parse(scenario)
  const dates = datesInPeriod(window.period.start, window.period.end)
  const partialDates = new Set(window.quality.partialDates)
  const groups = new Map<string, { point: HistoryPoint; dates: Set<string> }>()
  for (const date of dates) {
    const groupKey = granularity === 'daily' ? date : mondayOf(date)
    const end = granularity === 'daily' ? date : addDays(groupKey, 6)
    if (!groups.has(groupKey))
      groups.set(groupKey, {
        point: {
          start:
            groupKey < window.period.start ? window.period.start : groupKey,
          end: end > window.period.end ? window.period.end : end,
          observedDays: 0,
          partial: groupKey < window.period.start || end > window.period.end,
          baselineWh: null,
          scenarioWh: null,
          generationWh: null,
        },
        dates: new Set(),
      })
    if (partialDates.has(date)) {
      const group = groups.get(groupKey)
      if (group) group.point.partial = true
    }
  }
  for (const bucket of window.dayHours) {
    const group = groups.get(
      granularity === 'daily' ? bucket.date : mondayOf(bucket.date),
    )
    if (!group) continue
    group.dates.add(bucket.date)
    group.point.baselineWh =
      (group.point.baselineWh ?? 0) + bucket.consumptionWh
    group.point.scenarioWh =
      (group.point.scenarioWh ?? 0) +
      bucket.consumptionWh -
      savedWhForHour(bucket, scenario.reductionPercent)
    group.point.generationWh =
      (group.point.generationWh ?? 0) + bucket.generationWh
  }
  return [...groups.values()].map(({ point, dates: observed }) => ({
    ...point,
    observedDays: observed.size,
    partial:
      point.partial ||
      observed.size !== datesInPeriod(point.start, point.end).length,
  }))
}

export function getTypicalDayPoints(
  window: EnergyWindow,
  scenario: Scenario,
  filter: DayType = 'all',
): TypicalDayPoint[] {
  ScenarioSchema.parse(scenario)
  const sums = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    sampleDays: 0,
    baselineTotalWh: 0,
    scenarioTotalWh: 0,
    generationTotalWh: 0,
    intervalCount: 0,
    hasOffsetVariation: false,
  }))
  for (const bucket of window.dayHours) {
    const weekend = isWeekend(bucket.date)
    if ((filter === 'weekday' && weekend) || (filter === 'weekend' && !weekend))
      continue
    const slot = sums[bucket.hour]
    slot.sampleDays += 1
    slot.baselineTotalWh += bucket.consumptionWh
    slot.scenarioTotalWh +=
      bucket.consumptionWh - savedWhForHour(bucket, scenario.reductionPercent)
    slot.generationTotalWh += bucket.generationWh
    slot.intervalCount += bucket.intervalCount
    slot.hasOffsetVariation ||= bucket.intervalCount !== 4
  }
  return sums.map((slot) => ({
    ...slot,
    baselineWh: slot.sampleDays ? slot.baselineTotalWh / slot.sampleDays : null,
    scenarioWh: slot.sampleDays ? slot.scenarioTotalWh / slot.sampleDays : null,
    generationWh: slot.sampleDays
      ? slot.generationTotalWh / slot.sampleDays
      : null,
  }))
}

export function getMonthlyTotals(dayHours: DayHour[]) {
  const months = new Map<
    string,
    { month: string; consumptionWh: number; generationWh: number }
  >()
  for (const bucket of dayHours) {
    const month = bucket.date.slice(0, 7)
    const total = months.get(month) ?? {
      month,
      consumptionWh: 0,
      generationWh: 0,
    }
    total.consumptionWh += bucket.consumptionWh
    total.generationWh += bucket.generationWh
    months.set(month, total)
  }
  return [...months.values()]
}
