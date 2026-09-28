import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { gzipSync } from 'node:zlib'
import {
  getHistoryPoints,
  getTypicalDayPoints,
  sumEnergy,
} from '../src/domain/energy/aggregation'
import { addDays, isWeekend, mondayOf } from '../src/domain/energy/calendar'
import { calculateFacts } from '../src/domain/energy/facts'
import { whToKwh, whToUsd } from '../src/domain/energy/format'
import {
  type DayHour,
  DEFAULT_PERIOD,
  EnergyRequestSchema,
  type EnergyWindow,
  EnergyWindowSchema,
  ScenarioSchema,
  ZERO_SCENARIO,
} from '../src/domain/energy/schema'
import {
  getScenarioSummary,
  simulateDayHours,
} from '../src/domain/energy/simulation'
import { loadEnergyWindow } from '../src/server/services/energy.server'
import {
  dataVersionFor,
  parseEnergyCsv,
  parseTimestamp,
} from './parse-energy-csv'

const HEADER = 'datetime,duration,unit,consumption,generation\n'
const first = '2024-01-01T00:00:00-06:00,900,Wh,5,2\n'
const second = '2024-01-01T00:15:00-06:00,900,Wh,7,0\n'

test('strict CSV validation rejects malformed headers, numbers, quotes, and interval continuity', () => {
  assert.deepEqual(
    parseEnergyCsv(HEADER + first + second, 'low-winter').totals,
    { consumptionWh: 12, generationWh: 2 },
  )
  for (const bad of [
    HEADER.replace('generation', 'consumption') + first,
    HEADER + first.replace(',5,', ',,'),
    HEADER + first.replace(',5,', ',1.5,'),
    HEADER + first.replace(',5,', ',-1,'),
    HEADER + first.replace(',5,', ',9007199254740992,'),
    HEADER + first.replace(',900,', ',600,'),
    HEADER + first.replace(',Wh,', ',kWh,'),
    HEADER + first + first,
    HEADER + first + second.replace('00:15:', '00:30:'),
    `${HEADER}"unclosed,900,Wh,5,2\n`,
  ])
    assert.throws(() => parseEnergyCsv(bad, 'low-winter'))
  for (const bad of [
    '2024-02-30T00:00:00-06:00',
    '2024-01-01T24:00:00-06:00',
    '2024-01-01T00:00:00',
    '2024-01-01T00:00:00+15:00',
  ])
    assert.throws(() => parseTimestamp(bad))
})

test('preserves repeated local clock hours and labels partial boundary days', () => {
  const rows = [
    '2024-11-04T00:30:00-05:00,900,Wh,10,0',
    '2024-11-04T00:45:00-05:00,900,Wh,10,0',
    '2024-11-04T00:00:00-06:00,900,Wh,10,0',
    '2024-11-04T00:15:00-06:00,900,Wh,10,0',
  ]
  const parsed = parseEnergyCsv(HEADER + rows.join('\n'), 'low-winter')
  assert.equal(parsed.dayHours.length, 1)
  assert.deepEqual(parsed.dayHours[0], {
    date: '2024-11-04',
    hour: 0,
    consumptionWh: 40,
    generationWh: 0,
    intervalCount: 4,
  })
  assert.equal(parsed.offsetTransitions.length, 1)
  assert.deepEqual(parsed.partialDates, ['2024-11-04'])
  assert.deepEqual(parsed.completeDates, [])
})

test('real fixtures preserve 92, 96, and 100 interval days and reproduce exact default totals', () => {
  const expected = {
    'low-winter': [19857267, 0],
    'high-winter': [28923047, 0],
    solar: [20979789, 6304030],
  } as const
  for (const household of ['low-winter', 'high-winter', 'solar'] as const) {
    const raw = readFileSync(
      new URL(`../data/raw/${household}-interval-data.csv`, import.meta.url),
    )
    const parsed = parseEnergyCsv(raw, household)
    const counts = new Map<string, number>()
    for (const bucket of parsed.dayHours)
      counts.set(
        bucket.date,
        (counts.get(bucket.date) ?? 0) + bucket.intervalCount,
      )
    assert.equal(counts.get('2025-03-09'), 92)
    assert.equal(counts.get('2024-11-04'), 100)
    assert.equal(counts.get('2024-08-18'), 96)
    assert.deepEqual(parsed.partialDates, [])
    const window = loadEnergyWindow({ household, ...DEFAULT_PERIOD })
    EnergyWindowSchema.parse(window)
    assert.equal(window.totals.consumptionWh, expected[household][0])
    assert.equal(window.totals.generationWh, expected[household][1])
    assert.equal(window.period.observedDays, 365)
    assert.equal(
      getHistoryPoints(window, ZERO_SCENARIO, 'daily').reduce(
        (sum, point) => sum + (point.baselineWh ?? 0),
        0,
      ),
      window.totals.consumptionWh,
    )
    assert.equal(
      getHistoryPoints(window, ZERO_SCENARIO, 'weekly').reduce(
        (sum, point) => sum + (point.baselineWh ?? 0),
        0,
      ),
      window.totals.consumptionWh,
    )
    const compressed = gzipSync(JSON.stringify(window)).byteLength
    assert.ok(
      compressed < 150_000,
      `${household} response: ${compressed} bytes gzip`,
    )
  }
})

test('facts use actual daily averages and source dates', () => {
  const window = loadEnergyWindow({
    household: 'low-winter',
    ...DEFAULT_PERIOD,
  })
  const peak = window.facts.find((fact) => fact.id === 'consumption.peak-day')
  assert.ok(peak?.status === 'available' && peak.id === 'consumption.peak-day')
  assert.equal(peak.value.date, '2024-08-18')
  assert.equal(peak.value.consumptionWh, 114053)
  const comparison = window.facts.find(
    (fact) => fact.id === 'consumption.weekend-vs-weekday',
  )
  assert.ok(
    comparison?.status === 'available' &&
      comparison.id === 'consumption.weekend-vs-weekday',
  )
  const { weekendWh, weekendDays, weekdayWh, weekdayDays } = comparison.value
  assert.equal(
    ((weekendWh / weekendDays / (weekdayWh / weekdayDays) - 1) * 100).toFixed(
      1,
    ),
    '10.1',
  )
  assert.equal(
    window.facts.find((fact) => fact.id === 'scenario.carbon-equivalent')
      ?.status,
    'unavailable',
  )
})

test('calendar validation rejects rollover, excess coverage, reversed and overlong periods', () => {
  for (const period of [
    { start: '2024-02-30', end: '2024-03-01' },
    { start: '2025-01-02', end: '2025-01-01' },
    { start: '2024-01-01', end: '2025-01-01' },
  ])
    assert.equal(
      EnergyRequestSchema.safeParse({ household: 'solar', ...period }).success,
      false,
    )
  assert.throws(() =>
    loadEnergyWindow({
      household: 'solar',
      start: '2022-01-01',
      end: '2022-01-02',
    }),
  )
  assert.equal(mondayOf('2025-01-01'), '2024-12-30')
  assert.equal(addDays('2024-02-28', 1), '2024-02-29')
  assert.equal(isWeekend('2024-08-18'), true)
  assert.equal(whToKwh(1234), 1.234)
  assert.equal(whToUsd(1000), 0.14)
})

test('simulation rounds each eligible hourly bucket and preserves identities and generation', () => {
  const buckets: DayHour[] = [16, 17, 20, 21].map((hour) => ({
    date: '2024-01-01',
    hour,
    consumptionWh: 5,
    generationWh: 3,
    intervalCount: 4,
  }))
  const original = structuredClone(buckets)
  const scenario = { kind: 'reduce-evening', reductionPercent: 10 } as const
  assert.deepEqual(
    simulateDayHours(buckets, scenario).map((bucket) => bucket.consumptionWh),
    [5, 4, 4, 5],
  )
  assert.deepEqual(buckets, original)
  const largeBucket = { ...buckets[1], consumptionWh: Number.MAX_SAFE_INTEGER }
  const largeSummary = getScenarioSummary([largeBucket], {
    kind: 'reduce-evening',
    reductionPercent: 30,
  })
  assert.equal(
    largeSummary.savedWh,
    Number((BigInt(Number.MAX_SAFE_INTEGER) * 30n + 50n) / 100n),
  )
  assert.deepEqual(simulateDayHours(buckets, ZERO_SCENARIO), buckets)
  assert.deepEqual(getScenarioSummary(buckets, scenario), {
    baselineWh: 20,
    scenarioWh: 18,
    savedWh: 2,
    reductionPercent: 10,
  })
  let previous = 0
  const window = loadEnergyWindow({ household: 'solar', ...DEFAULT_PERIOD })
  for (let reductionPercent = 0; reductionPercent <= 30; reductionPercent++) {
    const current = { kind: 'reduce-evening', reductionPercent } as const
    const summary = getScenarioSummary(window.dayHours, current)
    const adjusted = sumEnergy(simulateDayHours(window.dayHours, current))
    assert.equal(adjusted.consumptionWh, summary.scenarioWh)
    assert.equal(adjusted.generationWh, window.totals.generationWh)
    assert.equal(summary.baselineWh, summary.scenarioWh + summary.savedWh)
    assert.ok(summary.savedWh >= previous)
    previous = summary.savedWh
  }
  for (const reductionPercent of [-1, 31, 1.5])
    assert.equal(
      ScenarioSchema.safeParse({ kind: 'reduce-evening', reductionPercent })
        .success,
      false,
    )
})

test('partial weeks retain actual days and typical hours never fill missing samples with zero', () => {
  const window = loadEnergyWindow({
    household: 'low-winter',
    start: '2025-01-01',
    end: '2025-01-08',
  })
  const weekly = getHistoryPoints(window, ZERO_SCENARIO, 'weekly')
  assert.deepEqual(
    weekly.map(({ start, end, observedDays, partial }) => ({
      start,
      end,
      observedDays,
      partial,
    })),
    [
      {
        start: '2025-01-01',
        end: '2025-01-05',
        observedDays: 5,
        partial: true,
      },
      {
        start: '2025-01-06',
        end: '2025-01-08',
        observedDays: 3,
        partial: true,
      },
    ],
  )
  const sparse: EnergyWindow = {
    ...window,
    dayHours: [
      {
        date: '2025-01-01',
        hour: 17,
        consumptionWh: 5,
        generationWh: 0,
        intervalCount: 4,
      },
      {
        date: '2025-01-02',
        hour: 17,
        consumptionWh: 15,
        generationWh: 0,
        intervalCount: 8,
      },
    ],
  }
  const profile = getTypicalDayPoints(sparse, {
    kind: 'reduce-evening',
    reductionPercent: 10,
  })
  assert.equal(profile[0].baselineWh, null)
  assert.equal(profile[17].sampleDays, 2)
  assert.equal(profile[17].baselineWh, 10)
  assert.equal(profile[17].scenarioWh, 8.5)
  assert.equal(profile[17].hasOffsetVariation, true)
  const noUsage = {
    ...window,
    dayHours: window.dayHours.map((bucket) => ({
      ...bucket,
      consumptionWh: 0,
    })),
    totals: { consumptionWh: 0, generationWh: 0 },
  }
  assert.equal(
    calculateFacts(noUsage).find(
      (fact) => fact.id === 'consumption.weekend-vs-weekday',
    )?.status,
    'unavailable',
  )
})

test('source versions and generated artifacts are deterministic', () => {
  assert.equal(
    JSON.stringify(parseEnergyCsv(HEADER + first + second, 'low-winter')),
    JSON.stringify(parseEnergyCsv(HEADER + first + second, 'low-winter')),
  )
  assert.notEqual(
    dataVersionFor(HEADER + first),
    dataVersionFor(HEADER + second),
  )
  assert.notEqual(
    dataVersionFor(HEADER + first, 'v1'),
    dataVersionFor(HEADER + first, 'v2'),
  )
})
