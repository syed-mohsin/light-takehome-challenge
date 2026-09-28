import {
  CalendarDays,
  Check,
  ChevronDown,
  House,
  Leaf,
  PiggyBank,
  Sun,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/skeleton'
import {
  type CarbonAssumption,
  DATASET_LABELS,
  type DashboardSearch,
  type DatasetId,
  DEFAULT_PERIOD,
  type EnergyWindow,
  formatDate,
  formatEnergy,
  formatMoney,
  getMonthlyTotals,
} from '../../domain/energy'
import type { InsightAction } from '../../domain/insights/schema'
import { DATA_VERSIONS } from '../../generated/data-versions'
import { PrioritySelector } from '../onboarding/priority-selector'
import { usePreference } from '../onboarding/use-preference'
import { CarbonAssumptionPanel } from './components/carbon-assumption-panel'
import { DashboardLayout } from './components/dashboard-layout'
import { EnergyChartSection } from './components/energy-chart-section'
import { InsightsSection } from './components/insights-section'
import { MetricCard } from './components/metric-card'
import { PeriodPicker } from './components/period-picker'
import { PriorityBanner } from './components/priority-banner'
import { useDashboardStory } from './hooks/use-dashboard-story'
import type { ChartView } from './hooks/use-energy-chart'
import { useScenario } from './hooks/use-scenario'

const householdDescriptions: Record<DatasetId, string> = {
  'low-winter': 'A summer-weighted electricity profile',
  'high-winter': 'A winter-weighted electricity profile',
  solar: 'Reported consumption and generation',
}

function focusElement(id: string) {
  requestAnimationFrame(() => {
    const element = document.getElementById(id)
    element?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'center',
    })
    element?.focus({ preventScroll: true })
  })
}

export function DashboardContainer({
  window: energy,
  search,
  onSearchChange,
  onRefresh,
  pending,
}: {
  window: EnergyWindow
  search: DashboardSearch
  onSearchChange: (updates: Partial<DashboardSearch>) => void
  onRefresh: () => void
  pending: boolean
}) {
  const preference = usePreference()
  const [view, setView] = useState<ChartView>('history')
  const [carbon, setCarbon] = useState<CarbonAssumption | null>(null)
  const [carbonPanelOpen, setCarbonPanelOpen] = useState(false)
  const { scenario, setReductionPercent } = useScenario(
    `${energy.household}:${energy.period.start}:${energy.period.end}`,
  )
  const story = useDashboardStory(energy, preference.priority, scenario, carbon)
  const monthly = useMemo(
    () => getMonthlyTotals(energy.dayHours).map((month) => month.consumptionWh),
    [energy],
  )
  const peak = energy.facts.find(
    (fact) => fact.status === 'available' && fact.id === 'consumption.peak-day',
  )
  function selectHousehold(household: DatasetId) {
    const coverage = DATA_VERSIONS[household].coverage
    const period =
      search.start < coverage.start || search.end > coverage.end
        ? DEFAULT_PERIOD
        : { start: search.start, end: search.end }
    onSearchChange({ household, ...period })
  }
  function act(action: InsightAction) {
    if (action === 'adjust-scenario') focusElement('reduction-slider')
    if (action === 'view-history' || action === 'view-typical-day') {
      setView(action === 'view-history' ? 'history' : 'typical-day')
      focusElement('usage-title')
    }
    if (action === 'set-carbon-factor') {
      setCarbonPanelOpen(true)
      focusElement('carbon-factor')
    }
  }
  const controls = (
    <>
      <label className="sr-only" htmlFor="household-select">
        Sample household
      </label>
      <div className="relative max-w-full">
        <select
          id="household-select"
          value={search.household}
          onChange={(event) => selectHousehold(event.target.value as DatasetId)}
          className="h-11 max-w-full appearance-none rounded-lg border border-line bg-surface py-0 pr-9 pl-3 text-xs font-medium text-ink"
          disabled={pending}
        >
          {(Object.keys(DATASET_LABELS) as DatasetId[]).map((household) => (
            <option value={household} key={household}>
              {DATASET_LABELS[household]}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted"
        />
      </div>
      <PeriodPicker
        key={`${search.household}:${search.start}:${search.end}`}
        period={search}
        coverage={DATA_VERSIONS[search.household].coverage}
        onChange={onSearchChange}
      />
    </>
  )
  return (
    <DashboardLayout headerActions={controls}>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.17em] text-muted">
            <span className="size-1.5 rounded-full bg-positive" />
            Your energy story
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            A clearer picture of your energy.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Understand the patterns. Explore the possibilities. Start with what
            matters to you.
          </p>
        </div>
        <div className="rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-medium text-muted">
          Sample household · historical data
        </div>
      </div>
      <div className="mb-4 min-h-11">
        {preference.ready ? (
          <PrioritySelector
            priority={preference.priority}
            onboarding={preference.onboarding}
            onChoose={preference.choose}
            onSkip={preference.skip}
            storageUnavailable={preference.storageUnavailable}
          />
        ) : (
          <Skeleton className="h-11 w-full max-w-2xl" />
        )}
      </div>
      {preference.ready ? (
        <PriorityBanner
          priority={preference.priority}
          {...story}
          onAction={() => act(story.action)}
        />
      ) : (
        <Skeleton className="h-36 w-full" />
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Recorded consumption"
          value={formatEnergy(energy.totals.consumptionWh, 0)}
          unit="kWh"
          detail="Metered use in your selected period"
          icon={<Zap />}
          tone="blue"
          sparkline={monthly}
        />
        <MetricCard
          label="Estimated cost"
          value={formatMoney(energy.totals.consumptionWh)}
          unit="USD"
          detail="Flat $0.14/kWh · before fees and taxes"
          icon={<PiggyBank />}
          tone="money"
          sparkline={monthly}
        />
        <MetricCard
          label="Daily average"
          value={formatEnergy(
            energy.totals.consumptionWh /
              Math.max(energy.period.observedDays, 1),
          )}
          unit="kWh/day"
          detail={`Across ${energy.period.observedDays} observed days${energy.quality.partialDates.length ? ' · includes partial days' : ''}`}
          icon={<House />}
          tone="blue"
        />
        <MetricCard
          label="Biggest-use day"
          value={
            peak?.status === 'available' && peak.id === 'consumption.peak-day'
              ? formatEnergy(peak.value.consumptionWh)
              : 'Unavailable'
          }
          unit="kWh"
          detail={
            peak?.status === 'available' && peak.id === 'consumption.peak-day'
              ? formatDate(peak.value.date)
              : 'No complete days in this period'
          }
          icon={<CalendarDays />}
          tone="money"
        />
      </div>
      {energy.household === 'solar' && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-positive/15 bg-positive-soft px-5 py-3 text-sm">
          <Sun aria-hidden="true" className="size-5 text-positive" />
          <p>
            <strong className="font-semibold text-positive">
              {formatEnergy(energy.totals.generationWh)} kWh
            </strong>{' '}
            of reported generation in this period.
          </p>
          <p className="text-xs text-muted">
            Shown separately; self-consumption and export credits are unknown.
          </p>
        </div>
      )}
      {pending && (
        <output className="mt-3 block text-sm text-muted">
          Loading the selected household and dates…
        </output>
      )}
      <div className="mt-9 space-y-8" aria-busy={pending}>
        <EnergyChartSection
          window={energy}
          search={search}
          scenario={scenario}
          onSearchChange={onSearchChange}
          onReductionChange={setReductionPercent}
          view={view}
          onViewChange={setView}
        />
        {(carbonPanelOpen || preference.priority === 'carbon') && (
          <CarbonAssumptionPanel value={carbon} onChange={setCarbon} />
        )}
        <InsightsSection
          window={energy}
          priority={preference.priority}
          scenario={scenario}
          carbonAssumption={carbon}
          preferenceReady={preference.ready}
          onAction={act}
          onRefresh={onRefresh}
        />
        <section aria-labelledby="examples-title">
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-muted">
              Different homes, different stories
            </p>
            <h2
              id="examples-title"
              className="mt-1.5 text-xl font-semibold tracking-tight"
            >
              Explore a sample household
            </h2>
            <p className="mt-1 text-xs text-muted">
              Three real datasets to explore. These homes are examples, not
              efficiency benchmarks.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(DATASET_LABELS) as DatasetId[]).map((household) => (
              <button
                key={household}
                type="button"
                disabled={pending}
                aria-pressed={household === search.household}
                onClick={() => selectHousehold(household)}
                className={`flex min-h-24 items-center gap-3 rounded-xl border p-4 text-left transition-colors ${household === search.household ? 'border-accent/50 bg-accent-soft' : 'border-line bg-surface hover:border-control-line'}`}
              >
                <span
                  className={`rounded-lg p-2 ${household === search.household ? 'bg-accent/10 text-accent-ink' : 'bg-canvas text-muted'}`}
                >
                  {household === 'solar' ? (
                    <Sun aria-hidden="true" className="size-5" />
                  ) : (
                    <House aria-hidden="true" className="size-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {DATASET_LABELS[household]}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    {householdDescriptions[household]}
                  </span>
                </span>
                {household === search.household && (
                  <Check
                    aria-hidden="true"
                    className="size-4 shrink-0 text-accent-ink"
                  />
                )}
              </button>
            ))}
          </div>
        </section>
        <details className="rounded-xl border border-line bg-surface px-5 py-4 text-xs text-muted">
          <summary className="flex w-fit cursor-pointer items-center gap-2 font-medium">
            <Leaf aria-hidden="true" className="size-3.5" />
            About these numbers
          </summary>
          <div className="mt-3 max-w-4xl space-y-2 leading-relaxed">
            <p>
              {energy.quality.intervalCount.toLocaleString('en-US')} original
              15-minute readings, grouped into hourly buckets. Daily and weekly
              views sum the same measurements. Mini bars show monthly totals;
              the first and last months may be partial.
            </p>
            {energy.quality.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
            <p>
              Cost is a flat-rate estimate before fees, taxes, and credits. A
              reduction scenario changes only 5–9 PM consumption; shifting usage
              alone would not save money on this tariff.
            </p>
            <p>
              Showing {formatDate(energy.period.start)} through{' '}
              {formatDate(energy.period.end)}. The supplied files span
              2023–2025, rather than the last twelve months from today.
            </p>
          </div>
        </details>
      </div>
    </DashboardLayout>
  )
}

export function DashboardError({ onReset }: { onReset: () => void }) {
  return (
    <DashboardLayout>
      <Card className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold">
          This view could not be loaded.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Choose a valid household and date range of up to 366 days within the
          supplied history. If the data was updated, reload the page or return
          to the sample year.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={onReset}>Return to sample year</Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </Card>
    </DashboardLayout>
  )
}
