import { getHistoryPoints } from './aggregation'
import { addDays, datesInPeriod, isWeekend, mondayOf } from './calendar'
import {
  type CarbonAssumption,
  type EnergyWindow,
  type InsightFact,
  type MetricId,
  type Scenario,
  ZERO_SCENARIO,
} from './schema'
import { getScenarioSummary, isEveningHour } from './simulation'

export function calculateFacts(
  window: EnergyWindow,
  scenario: Scenario = ZERO_SCENARIO,
  carbonAssumption: CarbonAssumption | null = null,
): InsightFact[] {
  const common = {
    dataVersion: window.dataVersion,
    period: { start: window.period.start, end: window.period.end },
    coverage: {
      completeDays: window.quality.completeDates.length,
      observedDays: window.period.observedDays,
    },
  }
  const unavailable = (id: MetricId, reason: string): InsightFact => ({
    ...common,
    id,
    status: 'unavailable',
    value: null,
    reason,
  })
  const available = { ...common, status: 'available' as const, reason: null }
  const facts: InsightFact[] = [
    {
      ...available,
      id: 'consumption.total',
      value: { consumptionWh: window.totals.consumptionWh },
    },
  ]
  const complete = new Set(window.quality.completeDates)
  const daily = getHistoryPoints(window, ZERO_SCENARIO, 'daily').filter(
    (point) => complete.has(point.start) && point.baselineWh !== null,
  )
  if (daily.length) {
    const maximum = Math.max(...daily.map((point) => point.baselineWh ?? 0))
    const peaks = daily.filter((point) => point.baselineWh === maximum)
    facts.push({
      ...available,
      id: 'consumption.peak-day',
      value: {
        date: peaks[0].start,
        consumptionWh: maximum,
        tiedDays: peaks.length,
      },
    })
  } else
    facts.push(
      unavailable(
        'consumption.peak-day',
        'No complete source-local days in this selection.',
      ),
    )

  let weekendWh = 0
  let weekendDays = 0
  let weekdayWh = 0
  let weekdayDays = 0
  for (const point of daily) {
    if (isWeekend(point.start)) {
      weekendWh += point.baselineWh ?? 0
      weekendDays += 1
    } else {
      weekdayWh += point.baselineWh ?? 0
      weekdayDays += 1
    }
  }
  const fullWeeks = new Set(daily.map((point) => mondayOf(point.start)))
  const eligibleWeeks = [...fullWeeks].filter((monday) =>
    datesInPeriod(monday, addDays(monday, 6)).every((date) =>
      complete.has(date),
    ),
  ).length
  if (eligibleWeeks >= 2 && weekendDays && weekdayDays && weekdayWh > 0)
    facts.push({
      ...available,
      id: 'consumption.weekend-vs-weekday',
      value: { weekendWh, weekendDays, weekdayWh, weekdayDays },
    })
  else
    facts.push(
      unavailable(
        'consumption.weekend-vs-weekday',
        'Requires two complete weeks and a positive weekday average.',
      ),
    )

  const byDate = new Map(
    daily.map((point) => [point.start, point.baselineWh ?? 0]),
  )
  let winterWh = 0
  let winterDays = 0
  let summerWh = 0
  let summerDays = 0
  for (
    let year = Number(window.period.start.slice(0, 4)) - 1;
    year <= Number(window.period.end.slice(0, 4));
    year++
  ) {
    const winter = datesInPeriod(
      `${year}-12-01`,
      addDays(`${year + 1}-03-01`, -1),
    )
    const summer = datesInPeriod(`${year}-06-01`, `${year}-08-31`)
    if (winter.every((date) => complete.has(date))) {
      winterDays += winter.length
      winterWh += winter.reduce((sum, date) => sum + (byDate.get(date) ?? 0), 0)
    }
    if (summer.every((date) => complete.has(date))) {
      summerDays += summer.length
      summerWh += summer.reduce((sum, date) => sum + (byDate.get(date) ?? 0), 0)
    }
  }
  if (winterDays && summerDays && summerWh > 0)
    facts.push({
      ...available,
      id: 'consumption.seasonality',
      value: { winterWh, winterDays, summerWh, summerDays },
    })
  else
    facts.push(
      unavailable(
        'consumption.seasonality',
        'Requires a complete winter and summer, with a positive summer average.',
      ),
    )

  const eveningWh = window.dayHours.reduce(
    (sum, bucket) =>
      sum + (isEveningHour(bucket.hour) ? bucket.consumptionWh : 0),
    0,
  )
  facts.push(
    window.totals.consumptionWh > 0
      ? {
          ...available,
          id: 'consumption.evening-share',
          value: { eveningWh, totalWh: window.totals.consumptionWh },
        }
      : unavailable(
          'consumption.evening-share',
          'No consumption was recorded in this period.',
        ),
  )
  facts.push(
    window.totals.generationWh > 0
      ? {
          ...available,
          id: 'generation.total',
          value: { generationWh: window.totals.generationWh },
        }
      : unavailable(
          'generation.total',
          'No positive generation was recorded in this period.',
        ),
  )
  const summary = getScenarioSummary(window.dayHours, scenario)
  facts.push({ ...available, id: 'scenario.saved-energy', value: summary })
  facts.push(
    carbonAssumption && summary.savedWh > 0
      ? {
          ...available,
          id: 'scenario.carbon-equivalent',
          value: {
            savedWh: summary.savedWh,
            kgCo2ePerKwh: carbonAssumption.kgCo2ePerKwh,
            kgCo2e: (summary.savedWh / 1000) * carbonAssumption.kgCo2ePerKwh,
            assumptionLabel: carbonAssumption.label,
          },
        }
      : unavailable(
          'scenario.carbon-equivalent',
          'Choose a reduction and provide an explicit emissions-factor assumption.',
        ),
  )
  return facts
}
