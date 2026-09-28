import { formatDate, formatEnergy } from '../energy/format'
import type { InsightFact } from '../energy/schema'
import {
  type Explanation,
  ExplanationSchema,
  type InsightAction,
  type InsightRequest,
  type MetricId,
} from './schema'

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const energy = (wh: number) => `${formatEnergy(wh)} kWh`

export const actionLabels: Record<InsightAction, string> = {
  'view-history': 'Explore your history',
  'view-typical-day': 'Explore a typical day',
  'adjust-scenario': 'Try an evening reduction',
  'set-carbon-factor': 'Set a carbon assumption',
  none: '',
}

export function historicalInsightCopy(fact: InsightFact) {
  if (fact.status === 'unavailable') {
    return {
      headline: 'Not enough data for this comparison',
      description: fact.reason,
    }
  }
  if (fact.id === 'consumption.peak-day') {
    return {
      headline: `${formatEnergy(fact.value.consumptionWh)} kWh on ${formatDate(fact.value.date)}`,
      description: `Your highest complete day in this period.${fact.value.tiedDays > 1 ? ` Earliest of ${fact.value.tiedDays} tied days.` : ''}`,
    }
  }
  if (fact.id === 'consumption.weekend-vs-weekday') {
    const weekend = fact.value.weekendWh / fact.value.weekendDays
    const weekday = fact.value.weekdayWh / fact.value.weekdayDays
    const delta = (weekend / weekday - 1) * 100
    return {
      headline:
        Math.abs(delta) < 0.05
          ? 'Similar daily usage through the week'
          : `Weekends use ${number.format(Math.abs(delta))}% ${delta > 0 ? 'more' : 'less'} per day`,
      description: `${formatEnergy(weekend)} kWh/day on weekends versus ${formatEnergy(weekday)} on weekdays. Averages account for different day counts.`,
    }
  }
  return { headline: 'Recorded pattern', description: factEvidence(fact) }
}

export function factEvidence(fact: InsightFact): string {
  if (fact.status === 'unavailable') return fact.reason
  switch (fact.id) {
    case 'consumption.total':
      return `${energy(fact.value.consumptionWh)} recorded consumption`
    case 'consumption.peak-day':
      return `${formatDate(fact.value.date)} · ${energy(fact.value.consumptionWh)}`
    case 'consumption.weekend-vs-weekday': {
      const weekend = fact.value.weekendWh / fact.value.weekendDays
      const weekday = fact.value.weekdayWh / fact.value.weekdayDays
      return `Weekend ${energy(weekend)}/day · weekday ${energy(weekday)}/day`
    }
    case 'consumption.seasonality':
      return `Winter ${energy(fact.value.winterWh / fact.value.winterDays)}/day · summer ${energy(fact.value.summerWh / fact.value.summerDays)}/day`
    case 'consumption.evening-share':
      return `${number.format((fact.value.eveningWh / fact.value.totalWh) * 100)}% of consumption between 5–9 PM`
    case 'generation.total':
      return `${energy(fact.value.generationWh)} reported generation`
    case 'scenario.saved-energy':
      return `${energy(fact.value.savedWh)} less consumption in this scenario`
    case 'scenario.carbon-equivalent':
      return `${number.format(fact.value.kgCo2e)} kg CO₂e hypothetical reduction at ${fact.value.kgCo2ePerKwh} kg/kWh`
  }
}

export function availableActions(request: InsightRequest): InsightAction[] {
  return [
    'view-history',
    'view-typical-day',
    'adjust-scenario',
    'none',
    ...(request.priority === 'carbon' && !request.carbonAssumption
      ? ['set-carbon-factor' as const]
      : []),
  ]
}

export function validExplanation(
  value: unknown,
  facts: InsightFact[],
  request: InsightRequest,
): Explanation | null {
  const parsed = ExplanationSchema.safeParse(value)
  if (!parsed.success) return null
  const explanation = parsed.data
  const available = new Set(
    facts.filter((fact) => fact.status === 'available').map((fact) => fact.id),
  )
  const text = [
    explanation.title,
    ...explanation.paragraphs.map((paragraph) => paragraph.text),
  ].join(' ')
  // Numbers belong to canonical evidence chips, never model-authored prose.
  if (
    /\p{N}/u.test(text) ||
    !availableActions(request).includes(explanation.actionId)
  )
    return null
  if (
    explanation.paragraphs.some(
      (paragraph) =>
        new Set(paragraph.evidenceIds).size !== paragraph.evidenceIds.length ||
        paragraph.evidenceIds.some((id) => !available.has(id)),
    )
  )
    return null
  return explanation
}

export function deterministicExplanation(
  request: InsightRequest,
  facts: InsightFact[],
): Explanation {
  const has = (id: MetricId) =>
    facts.some((fact) => fact.id === id && fact.status === 'available')
  const total: MetricId = 'consumption.total'
  if (request.priority === 'carbon') {
    if (has('scenario.carbon-equivalent'))
      return {
        title: 'A scenario, with an explicit assumption',
        paragraphs: [
          {
            text: 'Your selected evening reduction implies a lower consumption-equivalent footprint under your chosen factor. This is a hypothetical estimate, not a measurement of emissions avoided.',
            evidenceIds: [
              'scenario.carbon-equivalent',
              'scenario.saved-energy',
            ],
          },
        ],
        actionId: 'adjust-scenario',
      }
    return {
      title: 'Start with the energy you can see',
      paragraphs: [
        {
          text: request.carbonAssumption
            ? 'The meter records energy, not emissions. Your carbon assumption is set; try an evening reduction to explore a hypothetical consumption-equivalent change.'
            : 'The meter records energy, not emissions. Add an explicit carbon factor and try an evening reduction to explore an assumption-based change.',
          evidenceIds: [total],
        },
      ],
      actionId: request.carbonAssumption
        ? 'adjust-scenario'
        : 'set-carbon-factor',
    }
  }
  if (request.priority === 'money')
    return {
      title:
        request.scenario.reductionPercent > 0
          ? 'Small changes, visible savings'
          : 'Find room to use less',
      paragraphs: [
        {
          text:
            request.scenario.reductionPercent > 0
              ? 'Your scenario reduces evening consumption while keeping the rest of the recorded day unchanged. The estimated cost difference uses the same flat tariff as your dashboard.'
              : 'Explore how reducing evening consumption could change your estimated cost. With a flat tariff, using less energy changes the estimate; simply moving the same usage to another hour does not.',
          evidenceIds:
            has('scenario.saved-energy') &&
            request.scenario.reductionPercent > 0
              ? ['scenario.saved-energy']
              : [
                  has('consumption.evening-share')
                    ? 'consumption.evening-share'
                    : total,
                ],
        },
      ],
      actionId: 'adjust-scenario',
    }
  return {
    title: 'Every day tells part of the story',
    paragraphs: [
      {
        text: has('consumption.weekend-vs-weekday')
          ? 'The highest-use day highlights a moment worth exploring. Comparing daily averages for weekends and weekdays helps reveal patterns without assuming which appliances caused them.'
          : has('consumption.peak-day')
            ? 'The highest-use day highlights a moment worth exploring. Select a longer period to compare weekend and weekday daily averages without assuming which appliances caused the patterns.'
            : 'Your selected period provides recorded consumption totals. Explore the history or select a longer period to compare complete days and weekly patterns.',
        evidenceIds: [
          has('consumption.peak-day') ? 'consumption.peak-day' : total,
          ...(has('consumption.weekend-vs-weekday')
            ? ['consumption.weekend-vs-weekday' as const]
            : []),
        ],
      },
    ],
    actionId: 'view-history',
  }
}
