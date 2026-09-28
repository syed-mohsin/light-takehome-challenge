import assert from 'node:assert/strict'
import test from 'node:test'
import { sumEnergy } from '../src/domain/energy/aggregation'
import {
  type DayHour,
  type EnergyWindow,
  ZERO_SCENARIO,
} from '../src/domain/energy/schema'
import {
  calculateAnalogies,
  EnergyAnalogySchema,
} from '../src/domain/insights/analogies'

function bucket(date: string, consumptionWh: number, hour = 17): DayHour {
  return { date, hour, consumptionWh, generationWh: 0, intervalCount: 4 }
}

function fixture(
  dayHours: DayHour[],
  completeDates: string[],
  partialDates: string[] = [],
): EnergyWindow {
  const dates = [...new Set(dayHours.map((hour) => hour.date))].sort()
  const period = { start: dates[0], end: dates.at(-1) ?? dates[0] }
  return {
    household: 'low-winter',
    dataVersion: 'a'.repeat(64),
    period: { ...period, observedDays: dates.length },
    dayHours,
    totals: sumEnergy(dayHours),
    quality: {
      coverage: period,
      completeDates,
      partialDates,
      intervalCount: dayHours.reduce(
        (sum, hour) => sum + hour.intervalCount,
        0,
      ),
      offsetTransitions: [],
      notes: [],
    },
    facts: [],
  }
}

test('daily analogies use complete-day consumption only and disclose both denominators', () => {
  const window = fixture(
    [
      bucket('2025-01-01', 24_000, 12),
      bucket('2025-01-01', 36_000),
      bucket('2025-01-02', 48_000),
      bucket('2025-01-03', 999_000),
    ],
    ['2025-01-01', '2025-01-02'],
    ['2025-01-03'],
  )
  const analogies = calculateAnalogies(window, ZERO_SCENARIO)
  assert.equal(analogies.length, 2)
  assert.equal(analogies[0].equivalent, 'about 0.9 full 60 kWh EV batteries')
  assert.equal(
    analogies[1].equivalent,
    'about 225 LED bulbs running for 24 hours',
  )
  for (const analogy of analogies) {
    assert.match(analogy.scope, /per complete recorded day \(2 complete days\)/)
    assert.match(analogy.calculation, /108,000 Wh ÷ 2 complete recorded days/)
    assert.ok(EnergyAnalogySchema.safeParse(analogy).success)
  }
  assert.match(analogies[1].calculation, /10 W × 24 hours = 240 Wh/)
  assert.match(
    analogies[0].assumptions.join(' '),
    /charging losses are excluded/,
  )
})

test('no complete days omits daily analogies but preserves actual short-period scenario savings', () => {
  const window = fixture([bucket('2025-01-01', 30_000)], [], ['2025-01-01'])
  assert.deepEqual(calculateAnalogies(window, ZERO_SCENARIO), [])
  const analogies = calculateAnalogies(window, {
    kind: 'reduce-evening',
    reductionPercent: 20,
  })
  assert.equal(analogies.length, 1)
  assert.equal(analogies[0].id, 'scenario-ev-battery')
  assert.equal(analogies[0].equivalent, 'about 0.1 full 60 kWh EV batteries')
  assert.match(
    analogies[0].scope,
    /Hypothetical savings across the selected period/,
  )
  assert.match(analogies[0].scope, /Jan 1, 2025 through Jan 1, 2025/)
  assert.match(analogies[0].calculation, /6,000 Wh/)
  assert.match(
    analogies[0].assumptions.join(' '),
    /not annualized or a forecast/,
  )
})

test('zero consumption is explicit and a zero-saving scenario produces no savings analogy', () => {
  const zero = fixture([bucket('2025-01-01', 0)], ['2025-01-01'])
  assert.deepEqual(
    calculateAnalogies(zero, {
      kind: 'reduce-evening',
      reductionPercent: 30,
    }).map((analogy) => analogy.equivalent),
    ['0 full 60 kWh EV batteries', '0 LED bulbs running for 24 hours'],
  )
  const daytime = fixture([bucket('2025-01-01', 60_000, 12)], ['2025-01-01'])
  assert.equal(
    calculateAnalogies(daytime, {
      kind: 'reduce-evening',
      reductionPercent: 30,
    }).length,
    2,
  )
})

test('tiny positive daily and rounded hourly savings never display as zero', () => {
  const tiny = fixture([bucket('2025-01-01', 1)], ['2025-01-01'])
  const daily = calculateAnalogies(tiny, ZERO_SCENARIO)
  assert.equal(daily[0].equivalent, 'less than 0.01 full 60 kWh EV batteries')
  assert.equal(
    daily[1].equivalent,
    'less than 0.01 LED bulbs running for 24 hours',
  )

  const rounding = fixture([bucket('2025-01-01', 5)], [], ['2025-01-01'])
  const [saving] = calculateAnalogies(rounding, {
    kind: 'reduce-evening',
    reductionPercent: 10,
  })
  assert.match(saving.equivalent, /^less than 0.01/)
  assert.match(saving.calculation, /^1 Wh of selected-period scenario savings/)
  assert.ok(EnergyAnalogySchema.safeParse(saving).success)
})
