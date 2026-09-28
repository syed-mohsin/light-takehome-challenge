export type PlotPoint = {
  label: string
  shortLabel: string
  baseline: number | null
  scenario: number | null
  generation: number | null
  note?: string
}

export function formatPlotValue(value: number | null, unit: 'kWh' | 'usd') {
  if (value === null) return 'Unavailable'
  return unit === 'usd'
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(value)
    : `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)} kWh`
}
