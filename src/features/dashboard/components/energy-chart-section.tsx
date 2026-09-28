import { lazy, Suspense, useEffect, useState } from 'react'
import { Card } from '../../../components/ui/card'
import { SegmentedControl } from '../../../components/ui/segmented-control'
import { Skeleton } from '../../../components/ui/skeleton'
import type {
  DashboardSearch,
  EnergyWindow,
  Scenario,
} from '../../../domain/energy'
import { getScenarioSummary } from '../../../domain/energy'
import {
  type ChartView,
  type DayFilter,
  useEnergyChart,
} from '../hooks/use-energy-chart'
import { ChartDataTable } from './chart-data-table'
import { ScenarioControls } from './scenario-controls'

const EnergyPlot = lazy(() => import('./energy-plot'))

export function EnergyChartSection({
  window,
  search,
  onSearchChange,
  scenario,
  onReductionChange,
  view,
  onViewChange,
}: {
  window: EnergyWindow
  search: DashboardSearch
  onSearchChange: (updates: Partial<DashboardSearch>) => void
  scenario: Scenario
  onReductionChange: (percentage: number) => void
  view: ChartView
  onViewChange: (view: ChartView) => void
}) {
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState<DayFilter>('all')
  useEffect(() => setMounted(true), [])
  const points = useEnergyChart(window, scenario, search, view, filter)
  const summary = getScenarioSummary(window.dayHours, scenario)
  const showGeneration = window.totals.generationWh > 0 && search.unit === 'kWh'
  const showScenario = scenario.reductionPercent > 0
  return (
    <section id="usage" aria-labelledby="usage-title" className="scroll-mt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-muted">
            Usage patterns
          </p>
          <h2
            id="usage-title"
            tabIndex={-1}
            className="mt-1.5 text-xl font-semibold tracking-tight"
          >
            Your energy, over time.
          </h2>
        </div>
        <SegmentedControl
          label="Chart view"
          value={view}
          onChange={onViewChange}
          options={[
            { value: 'history', label: 'History' },
            { value: 'typical-day', label: 'Typical day' },
          ]}
        />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 sm:px-6">
          <div>
            <h3 className="text-sm font-semibold">
              {view === 'history'
                ? `${search.granularity === 'daily' ? 'Daily' : 'Weekly'} ${search.unit === 'usd' ? 'estimated cost' : 'electricity use'}`
                : 'A typical day in this period'}
            </h3>
            <p className="mt-1 text-xs text-muted">
              {view === 'history'
                ? `${window.period.observedDays} observed days · ${search.unit === 'usd' ? 'consumption at $0.14/kWh' : 'energy in kWh'}`
                : `Average hourly ${search.unit === 'usd' ? 'consumption cost' : 'consumption'} · ${filter === 'all' ? 'all days' : `${filter}s`}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {view === 'history' ? (
              <SegmentedControl
                label="Historical granularity"
                value={search.granularity}
                onChange={(granularity) => onSearchChange({ granularity })}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                ]}
              />
            ) : (
              <SegmentedControl
                label="Day type"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'weekday', label: 'Weekdays' },
                  { value: 'weekend', label: 'Weekends' },
                ]}
              />
            )}
            <SegmentedControl
              label="Chart units"
              value={search.unit}
              onChange={(unit) => onSearchChange({ unit })}
              options={[
                { value: 'kWh', label: 'kWh' },
                { value: 'usd', label: '$' },
              ]}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-5 px-5 pb-1 pt-5 text-xs text-muted sm:px-6">
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-4 bg-consumption" />
            Recorded
          </span>
          {showScenario && (
            <span className="flex items-center gap-2">
              <span className="w-4 border-t-2 border-dashed border-scenario" />
              With your scenario
            </span>
          )}
          {showGeneration && (
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-4 bg-positive" />
              Reported generation
            </span>
          )}
        </div>
        <div className="min-w-0 px-2 pb-3 pt-2 sm:px-5">
          {mounted ? (
            <Suspense fallback={<Skeleton className="h-80 w-full" />}>
              <EnergyPlot
                points={points}
                unit={search.unit}
                showScenario={showScenario}
                showGeneration={showGeneration}
                typical={view === 'typical-day'}
              />
            </Suspense>
          ) : (
            <Skeleton className="h-80 w-full" />
          )}
        </div>
        {window.totals.generationWh > 0 && search.unit === 'usd' && (
          <p className="px-5 pb-4 text-xs text-muted">
            Generation is hidden in dollars. Only reported consumption is
            priced; export credits are unknown.
          </p>
        )}
        {view === 'history' && search.granularity === 'weekly' && (
          <p className="px-5 pb-4 text-xs text-muted">
            Monday–Sunday totals. Weeks clipped by your date range are marked
            partial in tooltips and the table.
          </p>
        )}
        <ScenarioControls
          percentage={scenario.reductionPercent}
          onChange={onReductionChange}
          summary={summary}
        />
        <ChartDataTable
          key={`${window.household}:${view}:${search.granularity}`}
          points={points}
          unit={search.unit}
          showScenario={showScenario}
          showGeneration={showGeneration}
        />
      </Card>
    </section>
  )
}
