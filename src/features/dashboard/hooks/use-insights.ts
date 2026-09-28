import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateFacts } from '../../../domain/energy/facts'
import type {
  CarbonAssumption,
  EnergyWindow,
  Scenario,
} from '../../../domain/energy/schema'
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
import {
  readSavedExplanation,
  type SavedExplanation,
  saveExplanation,
} from '../insights-storage'

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
  const [view, setView] = useState<ViewState>({
    key: '',
    status: 'idle',
    explanation: null,
    cached: false,
  })
  const sequence = useRef(0)
  const activeKey = useRef(key)
  const pending = useRef<string | null>(null)
  const controller = useRef<AbortController | null>(null)
  const memory = useRef(new Map<string, SavedExplanation>())
  activeKey.current = key

  useEffect(() => {
    sequence.current += 1
    pending.current = null
    if (!preferenceReady) return
    const stored =
      memory.current.get(key) ?? readSavedExplanation(key, facts, request)
    const valid = stored && validExplanation(stored.explanation, facts, request)
    setView({
      key,
      status: valid ? 'ready' : 'idle',
      explanation: valid || null,
      cached: Boolean(valid),
    })
    return () => {
      sequence.current += 1
      controller.current?.abort()
    }
  }, [key, preferenceReady, facts, request])

  async function explain() {
    if (!preferenceReady || pending.current === key) return
    const stored =
      memory.current.get(key) ?? readSavedExplanation(key, facts, request)
    const valid = stored && validExplanation(stored.explanation, facts, request)
    if (valid) {
      setView({ key, status: 'ready', explanation: valid, cached: true })
      return
    }

    const requestId = ++sequence.current
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    pending.current = key
    setView({ key, status: 'loading', explanation: null, cached: false })
    try {
      const result = InsightResultSchema.parse(
        await getEnergyExplanation({ data: request, signal: abort.signal }),
      )
      if (requestId !== sequence.current || activeKey.current !== key) return
      if (result.kind === 'stale-data' || result.contextKey !== key) {
        setView({ key, status: 'stale-data', explanation: null, cached: false })
        return
      }
      if (result.source === 'ai' && result.status === 'ready') {
        const explanation = validExplanation(result.explanation, facts, request)
        if (!explanation) {
          setView({
            key,
            status: 'invalid-output',
            explanation: null,
            cached: false,
          })
          return
        }
        const entry = {
          contextKey: key,
          explanation,
          generatedAt: result.generatedAt,
        }
        memory.current.delete(key)
        memory.current.set(key, entry)
        if (memory.current.size > 10) {
          const oldest = memory.current.keys().next().value
          if (oldest !== undefined) memory.current.delete(oldest)
        }
        saveExplanation(entry)
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
      if (requestId === sequence.current && activeKey.current === key) {
        setView({
          key,
          status: 'unavailable',
          explanation: null,
          cached: false,
        })
      }
    } finally {
      if (requestId === sequence.current) pending.current = null
    }
  }

  const current = view.key === key ? view : null
  return {
    facts,
    explanation: current?.explanation ?? fallback,
    isAi: current?.status === 'ready' && Boolean(current.explanation),
    cached: current?.cached ?? false,
    status: current?.status ?? 'idle',
    explain,
  }
}
