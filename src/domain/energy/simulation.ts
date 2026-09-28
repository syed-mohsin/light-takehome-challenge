import { type DayHour, type Scenario, ScenarioSchema } from './schema'

export const SIMULATION_VERSION = 'evening-v1'
export const isEveningHour = (hour: number) => hour >= 17 && hour < 21

export function savedWhForHour(
  bucket: DayHour,
  reductionPercent: number,
): number {
  if (!isEveningHour(bucket.hour)) return 0
  const product = bucket.consumptionWh * reductionPercent
  // The fixture path stays in ordinary integer arithmetic. Preserve exact
  // half-up rounding even for larger supported safe-integer inputs.
  return Number.isSafeInteger(product)
    ? Math.round(product / 100)
    : Number(
        (BigInt(bucket.consumptionWh) * BigInt(reductionPercent) + 50n) / 100n,
      )
}

export function simulateDayHours(
  dayHours: DayHour[],
  scenario: Scenario,
): DayHour[] {
  ScenarioSchema.parse(scenario)
  return dayHours.map((bucket) => ({
    ...bucket,
    consumptionWh:
      bucket.consumptionWh - savedWhForHour(bucket, scenario.reductionPercent),
  }))
}

export function getScenarioSummary(dayHours: DayHour[], scenario: Scenario) {
  ScenarioSchema.parse(scenario)
  let baselineWh = 0
  let savedWh = 0
  for (const bucket of dayHours) {
    baselineWh += bucket.consumptionWh
    savedWh += savedWhForHour(bucket, scenario.reductionPercent)
  }
  return {
    baselineWh,
    scenarioWh: baselineWh - savedWh,
    savedWh,
    reductionPercent: scenario.reductionPercent,
  }
}
