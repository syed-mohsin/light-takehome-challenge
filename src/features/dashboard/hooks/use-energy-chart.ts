import { useMemo } from 'react'
import {
  type DashboardSearch,
  type EnergyWindow,
  formatDate,
  getHistoryPoints,
  getTypicalDayPoints,
  type Scenario,
  whToKwh,
  whToUsd,
} from '../../../domain/energy'
import type { PlotPoint } from '../chart-format'

export type ChartView = 'history' | 'typical-day'
export type DayFilter = 'all' | 'weekday' | 'weekend'

function hourLabel(hour: number) {
  return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`
}

export function useEnergyChart(
  window: EnergyWindow,
  scenario: Scenario,
  search: DashboardSearch,
  view: ChartView,
  filter: DayFilter,
) {
  return useMemo((): PlotPoint[] => {
    const convert = (wh: number | null) =>
      wh === null ? null : search.unit === 'usd' ? whToUsd(wh) : whToKwh(wh)
    if (view === 'typical-day') {
      return getTypicalDayPoints(window, scenario, filter).map((point) => ({
        label: `${hourLabel(point.hour)}–${hourLabel((point.hour + 1) % 24)}`,
        shortLabel: hourLabel(point.hour),
        baseline: convert(point.baselineWh),
        scenario: convert(point.scenarioWh),
        generation:
          point.generationWh === null ? null : whToKwh(point.generationWh),
        note: `Average across ${point.sampleDays} observed days${point.hasOffsetVariation ? '; includes source clock changes' : ''}.`,
      }))
    }
    return getHistoryPoints(window, scenario, search.granularity).map(
      (point) => ({
        label:
          point.start === point.end
            ? formatDate(point.start)
            : `${formatDate(point.start)} – ${formatDate(point.end)}`,
        shortLabel: formatDate(point.start, { month: 'short', day: 'numeric' }),
        baseline: convert(point.baselineWh),
        scenario: convert(point.scenarioWh),
        generation:
          point.generationWh === null ? null : whToKwh(point.generationWh),
        note: point.partial
          ? `Partial period · ${point.observedDays} observed days`
          : undefined,
      }),
    )
  }, [window, scenario, search.granularity, search.unit, view, filter])
}
