import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateFacts } from '../src/domain/energy/facts'
import { DEFAULT_PERIOD, ZERO_SCENARIO } from '../src/domain/energy/schema'
import { calculateAnalogies } from '../src/domain/insights/analogies'
import {
  analogyOptions,
  renderAnalogy,
} from '../src/domain/insights/analogy-presentation'
import {
  deterministicExplanation,
  validExplanation,
} from '../src/domain/insights/presentation'
import type { Explanation, InsightRequest } from '../src/domain/insights/schema'
import { loadEnergyWindow } from '../src/server/services/energy.server'

const window = loadEnergyWindow({ household: 'low-winter', ...DEFAULT_PERIOD })
const request: InsightRequest = {
  household: window.household,
  expectedDataVersion: window.dataVersion,
  period: DEFAULT_PERIOD,
  priority: 'money',
  scenario: ZERO_SCENARIO,
  carbonAssumption: null,
}
const facts = calculateFacts(window)
const comparisons = analogyOptions(calculateAnalogies(window, ZERO_SCENARIO))
const explanation: Explanation = {
  ...deterministicExplanation(request, facts),
  analogy: {
    id: 'daily-led-bulbs',
    template:
      'Picture {equivalent}. That puts your average recorded day in perspective.',
  },
}

test('analogy prose inserts the verified quantity and units without changing the model sentence', () => {
  assert.ok(validExplanation(explanation, facts, request, comparisons))
  const rendered = renderAnalogy(explanation.analogy, comparisons)
  assert.ok(rendered)
  assert.equal(rendered.comparison.id, 'daily-led-bulbs')
  assert.equal(
    rendered.text,
    `Picture ${rendered.comparison.equivalent}. That puts your average recorded day in perspective.`,
  )
  assert.equal(rendered.text.includes('{'), false)
})

test('unverified numbers, placeholders, and unavailable analogy choices are rejected', () => {
  for (const template of [
    'Picture 999 bulbs.',
    'Picture {equivalent} for 90 days.',
    'Picture {equivalent} or {equivalent}.',
    'Picture {equivalent} with {extra}.',
    'Picture lots of bulbs.',
    'Picture twice {equivalent}. That is your average day.',
    'Your average year uses the energy equivalent of {equivalent}.',
  ]) {
    const invalid = {
      ...explanation,
      analogy: { id: 'daily-led-bulbs', template },
    }
    assert.equal(validExplanation(invalid, facts, request, comparisons), null)
  }
  assert.equal(
    validExplanation(
      {
        ...explanation,
        analogy: { ...explanation.analogy, id: 'scenario-ev-battery' },
      },
      facts,
      request,
      comparisons,
    ),
    null,
  )
  assert.equal(
    validExplanation(
      { ...explanation, analogy: null },
      facts,
      request,
      comparisons,
    ),
    null,
  )
  assert.equal(
    validExplanation(
      {
        ...explanation,
        paragraphs: [
          {
            text: 'Explore your recorded use. [consumption.total]',
            evidenceIds: ['consumption.total'],
          },
        ],
      },
      facts,
      request,
      comparisons,
    ),
    null,
  )
})

test('an active savings comparison takes priority over baseline daily analogies', () => {
  const scenario = { kind: 'reduce-evening', reductionPercent: 20 } as const
  const scenarioRequest = { ...request, scenario }
  const scenarioFacts = calculateFacts(window, scenario)
  const options = analogyOptions(calculateAnalogies(window, scenario))
  assert.deepEqual(
    options.map((item) => item.id),
    ['scenario-ev-battery'],
  )
  assert.equal(
    validExplanation(explanation, scenarioFacts, scenarioRequest, options),
    null,
  )
  const scenarioExplanation: Explanation = {
    ...deterministicExplanation(scenarioRequest, scenarioFacts),
    analogy: {
      id: 'scenario-ev-battery',
      template:
        'Across your selected period, the scenario could save the energy equivalent of {equivalent}.',
    },
  }
  assert.ok(
    validExplanation(
      scenarioExplanation,
      scenarioFacts,
      scenarioRequest,
      options,
    ),
  )
  for (const template of [
    'Every day of your selected period, the scenario saves {equivalent}.',
    'Across your selected period, this saves twice {equivalent}.',
    'The scenario saves {equivalent} each year.',
  ])
    assert.equal(
      validExplanation(
        {
          ...scenarioExplanation,
          analogy: { id: 'scenario-ev-battery', template },
        },
        scenarioFacts,
        scenarioRequest,
        options,
      ),
      null,
    )
})
