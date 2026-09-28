import {
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Sparkles,
} from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import type {
  CarbonAssumption,
  EnergyWindow,
  InsightFact,
  Scenario,
} from '../../../domain/energy/schema'
import {
  actionLabels,
  factEvidence,
  historicalInsightCopy,
} from '../../../domain/insights/presentation'
import type { InsightAction } from '../../../domain/insights/schema'
import type { Priority } from '../../../domain/preferences/schema'
import { type InsightStatus, useInsights } from '../hooks/use-insights'
import { EnergyAnalogy } from './energy-analogy'

const statusMessages: Partial<Record<InsightStatus, string>> = {
  loading: 'Explaining your selected data…',
  disabled:
    'AI explanations are not enabled for this demo. Your calculated insights are still available.',
  unavailable:
    'An AI explanation could not be loaded. Your calculated insights are still available.',
  'invalid-output':
    'We could not verify the explanation. Showing your calculated summary instead.',
  'stale-data':
    'The source data changed. Refresh the dashboard before requesting an explanation.',
}

export function InsightsSection(props: {
  window: EnergyWindow
  priority: Priority
  scenario: Scenario
  carbonAssumption: CarbonAssumption | null
  preferenceReady: boolean
  onAction: (action: InsightAction) => void
  onRefresh: () => void
}) {
  const { facts, explanation, analogy, isAi, cached, status, explain } =
    useInsights(props)
  const evidenceIds = new Set(
    explanation.paragraphs.flatMap((paragraph) => paragraph.evidenceIds),
  )
  const evidence = facts.filter(
    (fact) => evidenceIds.has(fact.id) && fact.status === 'available',
  )
  const peak = facts.find((fact) => fact.id === 'consumption.peak-day')
  const weekend = facts.find(
    (fact) => fact.id === 'consumption.weekend-vs-weekday',
  )
  const seasonality = facts.find(
    (fact) => fact.id === 'consumption.seasonality',
  )

  return (
    <section aria-labelledby="insights-heading" className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          A closer look
        </p>
        <h2
          id="insights-heading"
          className="mt-1 text-xl font-semibold text-ink"
        >
          The patterns behind your usage
        </h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="space-y-6">
            {peak && (
              <HistoricalInsight
                fact={peak}
                onView={() => props.onAction('view-history')}
              />
            )}
            {weekend && (
              <HistoricalInsight
                fact={weekend}
                onView={() => props.onAction('view-history')}
              />
            )}
            {seasonality?.status === 'available' && (
              <p className="border-t border-line pt-4 text-xs leading-relaxed text-muted">
                <span className="font-semibold text-ink">
                  Seasonal perspective:
                </span>{' '}
                {factEvidence(seasonality)}. These are complete-season daily
                averages.
              </p>
            )}
          </div>
        </Card>
        <Card tone="positive" className="flex flex-col p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-surface/70 p-2 text-positive">
              <Sparkles aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-positive">
                {isAi ? 'AI explanation · Luna' : 'A note from your data'}
              </p>
              <h3 className="mt-1 font-semibold text-ink">
                {explanation.title}
              </h3>
            </div>
          </div>
          {isAi && analogy && <EnergyAnalogy {...analogy} />}
          <div className="mt-5 space-y-3 text-sm leading-relaxed text-ink">
            {explanation.paragraphs.map((paragraph) => (
              <p key={paragraph.text}>{paragraph.text}</p>
            ))}
          </div>
          <details className="mt-4 text-xs text-muted">
            <summary className="cursor-pointer font-medium text-ink">
              View supporting data
            </summary>
            <ul className="mt-2 space-y-2">
              {evidence.map((fact) => (
                <li
                  key={fact.id}
                  className="rounded-lg bg-surface/70 px-3 py-2 leading-relaxed"
                >
                  {factEvidence(fact)}
                </li>
              ))}
            </ul>
          </details>
          <div className="mt-auto pt-5">
            <p
              aria-live="polite"
              className="min-h-5 text-xs leading-relaxed text-muted"
            >
              {statusMessages[status] ??
                (isAi
                  ? cached
                    ? 'Saved explanation from this browser.'
                    : 'Explanation based on your selected data.'
                  : 'Optional AI explanation, grounded in the figures above.')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {status === 'stale-data' ? (
                <Button variant="secondary" onClick={props.onRefresh}>
                  Refresh dashboard
                </Button>
              ) : (
                !isAi && (
                  <Button
                    variant="secondary"
                    pending={status === 'loading'}
                    disabled={!props.preferenceReady || status === 'loading'}
                    onClick={() => void explain()}
                  >
                    <Sparkles aria-hidden="true" className="size-4" />
                    {status === 'loading'
                      ? 'Explaining…'
                      : status === 'idle'
                        ? 'Explain these patterns'
                        : 'Try explanation again'}
                  </Button>
                )
              )}
              {explanation.actionId !== 'none' && (
                <Button
                  variant="quiet"
                  onClick={() => props.onAction(explanation.actionId)}
                >
                  {actionLabels[explanation.actionId]}
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Button>
              )}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted">
              Meter data shows patterns, not their causes. Scenarios are
              hypothetical. AI prose may be imperfect; the supporting figures
              are calculated directly.
            </p>
          </div>
        </Card>
      </div>
    </section>
  )
}

function HistoricalInsight({
  fact,
  onView,
}: {
  fact: InsightFact
  onView: () => void
}) {
  const isPeak = fact.id === 'consumption.peak-day'
  const { headline, description } = historicalInsightCopy(fact)
  const Icon = isPeak ? CalendarDays : ChartNoAxesCombined
  return (
    <div className="flex items-start gap-3">
      <span className="rounded-lg bg-accent-soft p-2 text-accent-ink">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted">
          Historical · {isPeak ? 'Biggest-use day' : 'Weekend vs. weekday'}
        </p>
        <h3 className="mt-1 text-base font-semibold text-ink">{headline}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
        {fact.status === 'available' && (
          <Button variant="quiet" className="mt-2" onClick={onView}>
            View data
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
