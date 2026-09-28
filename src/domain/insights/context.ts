import type { InsightRequest } from './schema'

// Bump when the prompt, model, metrics, tariff, or scenario rules change.
export const EXPLANATION_VERSION = 'energy-explainer-v2-analogies'

export function insightContextKey(request: InsightRequest): string {
  return JSON.stringify([
    EXPLANATION_VERSION,
    request.expectedDataVersion,
    request.household,
    request.period.start,
    request.period.end,
    request.priority,
    request.scenario.kind,
    request.scenario.reductionPercent,
    request.carbonAssumption?.kgCo2ePerKwh ?? null,
    request.carbonAssumption?.label ?? null,
    'en-US',
  ])
}
