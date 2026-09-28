import { calculateFacts } from '../../domain/energy/facts'
import { calculateAnalogies } from '../../domain/insights/analogies'
import { analogyOptions } from '../../domain/insights/analogy-presentation'
import { insightContextKey } from '../../domain/insights/context'
import {
  availableActions,
  deterministicExplanation,
  factEvidence,
  validExplanation,
} from '../../domain/insights/presentation'
import {
  type InsightRequest,
  InsightRequestSchema,
  type InsightResult,
  InsightResultSchema,
} from '../../domain/insights/schema'
import {
  explainWithLuna,
  InvalidModelOutputError,
} from '../providers/openai.server'
import { loadEnergyWindow } from './energy.server'

export async function explainEnergy(
  request: InsightRequest,
): Promise<InsightResult> {
  const input = InsightRequestSchema.parse(request)
  const deadline = AbortSignal.timeout(15_000)
  const window = await loadEnergyWindow({
    household: input.household,
    ...input.period,
  })
  if (input.expectedDataVersion !== window.dataVersion) {
    return InsightResultSchema.parse({
      kind: 'stale-data',
      dataVersion: window.dataVersion,
    })
  }
  const canonical = { ...input, expectedDataVersion: window.dataVersion }
  const facts = calculateFacts(window, input.scenario, input.carbonAssumption)
  const analogies = analogyOptions(calculateAnalogies(window, input.scenario))
  const fallback = {
    kind: 'content' as const,
    contextKey: insightContextKey(canonical),
    source: 'deterministic' as const,
    explanation: deterministicExplanation(canonical, facts),
    facts,
    generatedAt: new Date().toISOString(),
  }

  if (
    process.env.AI_INSIGHTS_ENABLED !== 'true' ||
    !process.env.OPENAI_API_KEY
  ) {
    return InsightResultSchema.parse({ ...fallback, status: 'disabled' })
  }

  try {
    const output = await explainWithLuna(
      {
        priority: input.priority,
        period: input.period,
        scenarioPercent: input.scenario.reductionPercent,
        facts: facts
          .filter((fact) => fact.status === 'available')
          .map((fact) => ({
            id: fact.id,
            evidence: factEvidence(fact),
          })),
        availableActions: availableActions(canonical),
        analogies,
      },
      deadline,
    )
    const explanation = validExplanation(output, facts, canonical, analogies)
    if (!explanation)
      throw new InvalidModelOutputError('Unsupported explanation content')
    return InsightResultSchema.parse({
      ...fallback,
      explanation,
      source: 'ai',
      status: 'ready',
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    // No upstream messages or key details are returned to the browser.
    return InsightResultSchema.parse({
      ...fallback,
      status:
        error instanceof InvalidModelOutputError
          ? 'invalid-output'
          : 'unavailable',
    })
  }
}
