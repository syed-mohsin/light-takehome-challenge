import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateFacts } from '../../../domain/energy/facts'
import type {
  CarbonAssumption,
  EnergyWindow,
  Scenario,
} from '../../../domain/energy/schema'
import { calculateAnalogies } from '../../../domain/insights/analogies'
import {
  analogyOptions,
  renderAnalogy,
} from '../../../domain/insights/analogy-presentation'
import { insightContextKey } from '../../../domain/insights/context'
import {
  deterministicExplanation,
  validExplanation,
} from '../../../domain/insights/presentation'
import {
  type Explanation,
  type InsightRequest,
  InsightResultSchema,
} from '../../../domain/insights/schema'
import type { Priority } from '../../../domain/preferences/schema'
import { getEnergyExplanation } from '../../../server/functions/insights'
import { readSavedExplanation, saveExplanation } from '../insights-storage'

export type InsightStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'disabled'
  | 'unavailable'
  | 'invalid-output'
  | 'stale-data'
type ViewState = {
  key: string
  status: InsightStatus
  explanation: Explanation | null
  cached: boolean
}

export function useInsights({
  window,
  priority,
  scenario,
  carbonAssumption,
  preferenceReady,
}: {
  window: EnergyWindow
  priority: Priority
  scenario: Scenario
  carbonAssumption: CarbonAssumption | null
  preferenceReady: boolean
}) {
  const carbonFactor = carbonAssumption?.kgCo2ePerKwh
  const carbonLabel = carbonAssumption?.label
  const request = useMemo<InsightRequest>(
    () => ({
      household: window.household,
      expectedDataVersion: window.dataVersion,
      period: { start: window.period.start, end: window.period.end },
      priority,
      scenario: {
        kind: 'reduce-evening',
        reductionPercent: scenario.reductionPercent,
      },
      carbonAssumption:
        carbonFactor !== undefined && carbonLabel !== undefined
          ? { kgCo2ePerKwh: carbonFactor, label: carbonLabel }
          : null,
    }),
    [
      window.household,
      window.dataVersion,
      window.period.start,
      window.period.end,
      priority,
      scenario.reductionPercent,
      carbonFactor,
      carbonLabel,
    ],
  )
  const key = insightContextKey(request)
  const facts = useMemo(
    () => calculateFacts(window, request.scenario, request.carbonAssumption),
    [window, request],
  )
  const fallback = useMemo(
    () => deterministicExplanation(request, facts),
    [request, facts],
  )
  const analogies = useMemo(
    () => analogyOptions(calculateAnalogies(window, request.scenario)),
    [window, request.scenario],
  )
  const [view, setView] = useState<ViewState>({
    key: '',
    status: 'idle',
    explanation: null,
    cached: false,
  })
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!preferenceReady) return
    const stored = readSavedExplanation(key, facts, request, analogies)
    setView({
      key,
      status: stored ? 'ready' : 'idle',
      explanation: stored?.explanation ?? null,
      cached: Boolean(stored),
    })
    return () => {
      controller.current?.abort()
      controller.current = null
    }
  }, [key, preferenceReady, facts, request, analogies])

  async function explain() {
    if (!preferenceReady || controller.current) return
    const stored = readSavedExplanation(key, facts, request, analogies)
    if (stored) {
      setView({
        key,
        status: 'ready',
        explanation: stored.explanation,
        cached: true,
      })
      return
    }

    const abort = new AbortController()
    controller.current = abort
    setView({ key, status: 'loading', explanation: null, cached: false })
    try {
      const result = InsightResultSchema.parse(
        await getEnergyExplanation({ data: request, signal: abort.signal }),
      )
      if (abort.signal.aborted) return
      if (result.kind === 'stale-data' || result.contextKey !== key) {
        setView({ key, status: 'stale-data', explanation: null, cached: false })
        return
      }
      if (result.source === 'ai' && result.status === 'ready') {
        const explanation = validExplanation(
          result.explanation,
          facts,
          request,
          analogies,
        )
        if (!explanation) {
          setView({
            key,
            status: 'invalid-output',
            explanation: null,
            cached: false,
          })
          return
        }
        saveExplanation({
          contextKey: key,
          explanation,
          generatedAt: result.generatedAt,
        })
        setView({ key, status: 'ready', explanation, cached: false })
      } else {
        setView({
          key,
          status: result.status,
          explanation: null,
          cached: false,
        })
      }
    } catch {
      if (!abort.signal.aborted) {
        setView({
          key,
          status: 'unavailable',
          explanation: null,
          cached: false,
        })
      }
    } finally {
      if (controller.current === abort) controller.current = null
    }
  }

  const current = view.key === key ? view : null
  return {
    facts,
    explanation: current?.explanation ?? fallback,
    analogy: renderAnalogy(current?.explanation?.analogy ?? null, analogies),
    isAi: current?.status === 'ready' && Boolean(current.explanation),
    cached: current?.cached ?? false,
    status: current?.status ?? 'idle',
    explain,
  }
}
