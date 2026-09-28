import { z } from 'zod'
import { daysBetween, isCalendarDate } from './calendar'

export const DatasetIdSchema = z.enum(['low-winter', 'high-winter', 'solar'])
export type DatasetId = z.infer<typeof DatasetIdSchema>
export const DateSchema = z
  .string()
  .refine(isCalendarDate, 'Use a real date in YYYY-MM-DD format.')
export const WhSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER)
export const PeriodSchema = z
  .object({ start: DateSchema, end: DateSchema })
  .strict()
  .refine(
    ({ start, end }) => start <= end && daysBetween(start, end) < 366,
    'Choose an ordered period of at most 366 days.',
  )
export type Period = z.infer<typeof PeriodSchema>
export const DEFAULT_PERIOD: Period = { start: '2024-04-22', end: '2025-04-21' }
export const DEFAULT_HOUSEHOLD: DatasetId = 'low-winter'
export const DATASET_LABELS: Record<DatasetId, string> = {
  'low-winter': 'Low winter household',
  'high-winter': 'High winter household',
  solar: 'Solar household',
}
export const EnergyRequestSchema = z
  .object({ household: DatasetIdSchema, start: DateSchema, end: DateSchema })
  .strict()
  .refine(
    ({ start, end }) => start <= end && daysBetween(start, end) < 366,
    'Choose an ordered period of at most 366 days.',
  )
export type EnergyRequest = z.infer<typeof EnergyRequestSchema>
export const DashboardSearchSchema = z
  .object({
    household: DatasetIdSchema.default(DEFAULT_HOUSEHOLD),
    start: DateSchema.default(DEFAULT_PERIOD.start),
    end: DateSchema.default(DEFAULT_PERIOD.end),
    granularity: z.enum(['daily', 'weekly']).default('daily'),
    unit: z.enum(['kWh', 'usd']).default('kWh'),
  })
  .refine(
    ({ start, end }) => start <= end && daysBetween(start, end) < 366,
    'Choose an ordered period of at most 366 days.',
  )
export type DashboardSearch = z.infer<typeof DashboardSearchSchema>
export const ScenarioSchema = z
  .object({
    kind: z.literal('reduce-evening'),
    reductionPercent: z.number().int().min(0).max(30),
  })
  .strict()
export type Scenario = z.infer<typeof ScenarioSchema>
export const ZERO_SCENARIO: Scenario = {
  kind: 'reduce-evening',
  reductionPercent: 0,
}
export const CarbonAssumptionSchema = z
  .object({
    kgCo2ePerKwh: z
      .number()
      .finite()
      .positive()
      .max(2)
      .refine(
        (value) => Math.abs(value * 10000 - Math.round(value * 10000)) < 1e-8,
        'Use at most four decimal places.',
      ),
    label: z.string().trim().min(1).max(80),
  })
  .strict()
export type CarbonAssumption = z.infer<typeof CarbonAssumptionSchema>
export const DayHourSchema = z
  .object({
    date: DateSchema,
    hour: z.number().int().min(0).max(23),
    consumptionWh: WhSchema,
    generationWh: WhSchema,
    intervalCount: z.number().int().positive(),
  })
  .strict()
export type DayHour = z.infer<typeof DayHourSchema>
export const TotalsSchema = z
  .object({ consumptionWh: WhSchema, generationWh: WhSchema })
  .strict()
export const OffsetTransitionSchema = z
  .object({
    before: z.string(),
    after: z.string(),
    fromOffsetMinutes: z.number().int(),
    toOffsetMinutes: z.number().int(),
  })
  .strict()
export const WindowQualitySchema = z
  .object({
    coverage: z.object({ start: DateSchema, end: DateSchema }).strict(),
    completeDates: z.array(DateSchema),
    partialDates: z.array(DateSchema),
    intervalCount: z.number().int().nonnegative(),
    offsetTransitions: z.array(OffsetTransitionSchema),
    notes: z.array(z.string()),
  })
  .strict()
export type WindowQuality = z.infer<typeof WindowQualitySchema>
export const MetricIdSchema = z.enum([
  'consumption.total',
  'consumption.peak-day',
  'consumption.weekend-vs-weekday',
  'consumption.seasonality',
  'consumption.evening-share',
  'generation.total',
  'scenario.saved-energy',
  'scenario.carbon-equivalent',
])
export type MetricId = z.infer<typeof MetricIdSchema>
const factBase = {
  dataVersion: z.string().regex(/^[a-f0-9]{64}$/),
  period: PeriodSchema,
  coverage: z
    .object({
      completeDays: z.number().int().nonnegative(),
      observedDays: z.number().int().nonnegative(),
    })
    .strict(),
}
const available = {
  ...factBase,
  status: z.literal('available'),
  reason: z.null(),
}
export const InsightFactSchema = z.union([
  z
    .object({
      ...available,
      id: z.literal('consumption.total'),
      value: z.object({ consumptionWh: WhSchema }).strict(),
    })
    .strict(),
  z
    .object({
      ...available,
      id: z.literal('consumption.peak-day'),
      value: z
        .object({
          date: DateSchema,
          consumptionWh: WhSchema,
          tiedDays: z.number().int().positive(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...available,
      id: z.literal('consumption.weekend-vs-weekday'),
      value: z
        .object({
          weekendWh: WhSchema,
          weekendDays: z.number().int().positive(),
          weekdayWh: WhSchema,
          weekdayDays: z.number().int().positive(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...available,
      id: z.literal('consumption.seasonality'),
      value: z
        .object({
          winterWh: WhSchema,
          winterDays: z.number().int().positive(),
          summerWh: WhSchema,
          summerDays: z.number().int().positive(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...available,
      id: z.literal('consumption.evening-share'),
      value: z.object({ eveningWh: WhSchema, totalWh: WhSchema }).strict(),
    })
    .strict(),
  z
    .object({
      ...available,
      id: z.literal('generation.total'),
      value: z.object({ generationWh: WhSchema }).strict(),
    })
    .strict(),
  z
    .object({
      ...available,
      id: z.literal('scenario.saved-energy'),
      value: z
        .object({
          baselineWh: WhSchema,
          scenarioWh: WhSchema,
          savedWh: WhSchema,
          reductionPercent: z.number().int().min(0).max(30),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...available,
      id: z.literal('scenario.carbon-equivalent'),
      value: z
        .object({
          savedWh: WhSchema,
          kgCo2ePerKwh: z.number().positive(),
          kgCo2e: z.number().nonnegative(),
          assumptionLabel: z.string(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...factBase,
      id: MetricIdSchema,
      status: z.literal('unavailable'),
      value: z.null(),
      reason: z.string(),
    })
    .strict(),
])
export type InsightFact = z.infer<typeof InsightFactSchema>
export const EnergyWindowSchema = z
  .object({
    dataVersion: z.string().regex(/^[a-f0-9]{64}$/),
    household: DatasetIdSchema,
    period: z
      .object({
        start: DateSchema,
        end: DateSchema,
        observedDays: z.number().int().nonnegative(),
      })
      .strict(),
    dayHours: z.array(DayHourSchema),
    totals: TotalsSchema,
    quality: WindowQualitySchema,
    facts: z.array(InsightFactSchema),
  })
  .strict()
export type EnergyWindow = z.infer<typeof EnergyWindowSchema>
export const ArtifactSchema = z
  .object({
    household: DatasetIdSchema,
    dataVersion: z.string().regex(/^[a-f0-9]{64}$/),
    coverage: z.object({ start: DateSchema, end: DateSchema }).strict(),
    firstTimestamp: z.string(),
    lastTimestamp: z.string(),
    intervalCount: z.number().int().positive(),
    dayHours: z.array(DayHourSchema),
    completeDates: z.array(DateSchema),
    partialDates: z.array(DateSchema),
    offsetTransitions: z.array(OffsetTransitionSchema),
    totals: TotalsSchema,
  })
  .strict()
export type EnergyArtifact = z.infer<typeof ArtifactSchema>
