import { z } from 'zod'
import { sumEnergy } from '../energy/aggregation'
import { formatDate } from '../energy/format'
import type { EnergyWindow, Scenario } from '../energy/schema'
import { getScenarioSummary } from '../energy/simulation'

export const AnalogyIdSchema = z.enum([
  'daily-ev-battery',
  'daily-led-bulbs',
  'scenario-ev-battery',
])

export const EnergyAnalogySchema = z
  .object({
    id: AnalogyIdSchema,
    equivalent: z.string().trim().min(1).max(200),
    scope: z.string().trim().min(1).max(250),
    calculation: z.string().trim().min(1).max(600),
    assumptions: z.array(z.string().trim().min(1).max(300)).min(1).max(5),
  })
  .strict()
export type EnergyAnalogy = z.infer<typeof EnergyAnalogySchema>

const EV_BATTERY_WH = 60_000
const LED_WATTS = 10
const LED_HOURS = 24
const LED_DAY_WH = LED_WATTS * LED_HOURS
const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const calculationNumber = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: 3,
})

function estimate(value: number, maximumFractionDigits: number): string {
  if (value === 0) return '0'
  if (value < 0.01) return 'less than 0.01'
  return `about ${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value < 1 ? 2 : maximumFractionDigits,
  }).format(value)}`
}

export function calculateAnalogies(
  window: EnergyWindow,
  scenario: Scenario,
): EnergyAnalogy[] {
  const partialDates = new Set(window.quality.partialDates)
  const completeDates = new Set(
    window.quality.completeDates.filter(
      (date) =>
        date >= window.period.start &&
        date <= window.period.end &&
        !partialDates.has(date),
    ),
  )
  const completeBuckets = window.dayHours.filter((bucket) =>
    completeDates.has(bucket.date),
  )
  const dayCount = new Set(completeBuckets.map((bucket) => bucket.date)).size
  const analogies: EnergyAnalogy[] = []

  if (dayCount > 0) {
    const totalWh = sumEnergy(completeBuckets).consumptionWh
    const averageWh = totalWh / dayCount
    const evBatteries = averageWh / EV_BATTERY_WH
    const ledBulbs = averageWh / LED_DAY_WH
    const days = `${integer.format(dayCount)} complete recorded ${dayCount === 1 ? 'day' : 'days'}`
    const averageCalculation = `${integer.format(totalWh)} Wh ÷ ${days}`
    const scope = `Average consumption per complete recorded day (${integer.format(dayCount)} complete ${dayCount === 1 ? 'day' : 'days'}).`
    const completeDayAssumption =
      'Uses only complete source-local dates; partial days are excluded. Recorded days may be shorter or longer when the source offset changes.'

    analogies.push(
      {
        id: 'daily-ev-battery',
        equivalent: `${estimate(evBatteries, 2)} full 60 kWh EV batteries`,
        scope,
        calculation: `${averageCalculation} ÷ 60,000 Wh per battery ≈ ${calculationNumber.format(evBatteries)} batteries per complete recorded day.`,
        assumptions: [
          'Assumes 60 kWh of stored energy per full EV battery; charging losses are excluded.',
          completeDayAssumption,
          'An illustrative energy comparison, not evidence of EV ownership or charging.',
        ],
      },
      {
        id: 'daily-led-bulbs',
        equivalent: `${estimate(ledBulbs, 0)} LED bulbs running for 24 hours`,
        scope,
        calculation: `${averageCalculation} ÷ (10 W × 24 hours = 240 Wh per bulb) ≈ ${calculationNumber.format(ledBulbs)} bulbs running for 24 hours.`,
        assumptions: [
          'Assumes each LED bulb draws a constant 10 W for 24 hours, or 240 Wh per bulb.',
          completeDayAssumption,
          'An illustrative energy comparison, not an estimate of actual lighting use or appliance counts.',
        ],
      },
    )
  }

  const summary = getScenarioSummary(window.dayHours, scenario)
  if (scenario.reductionPercent > 0 && summary.savedWh > 0) {
    const evBatteries = summary.savedWh / EV_BATTERY_WH
    analogies.push({
      id: 'scenario-ev-battery',
      equivalent: `${estimate(evBatteries, 2)} full 60 kWh EV batteries`,
      scope: `Hypothetical savings across the selected period (${formatDate(window.period.start)} through ${formatDate(window.period.end)}).`,
      calculation: `${integer.format(summary.savedWh)} Wh of selected-period scenario savings ÷ 60,000 Wh per battery ≈ ${calculationNumber.format(evBatteries)} batteries.`,
      assumptions: [
        'Assumes 60 kWh of stored energy per full EV battery; charging losses are excluded.',
        `Uses the ${scenario.reductionPercent}% reduction of recorded 5–9 PM consumption, with saved Wh rounded once per hourly bucket.`,
        'Covers only the selected period, including any partial recorded days; it is not annualized or a forecast.',
        'An illustrative energy comparison, not evidence of EV ownership or charging.',
      ],
    })
  }

  return analogies
}
