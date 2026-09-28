import { z } from 'zod'
import {
  CarbonAssumptionSchema,
  DatasetIdSchema,
  InsightFactSchema,
  MetricIdSchema,
  PeriodSchema,
  ScenarioSchema,
} from '../energy/schema'
import { PrioritySchema } from '../preferences/schema'
import { AnalogyIdSchema } from './analogies'

export { MetricIdSchema } from '../energy/schema'

export const ActionIdSchema = z.enum([
  'view-history',
  'view-typical-day',
  'adjust-scenario',
  'set-carbon-factor',
  'none',
])

export const InsightRequestSchema = z
  .object({
    household: DatasetIdSchema,
    expectedDataVersion: z.string().regex(/^[a-f0-9]{64}$/),
    period: PeriodSchema,
    priority: PrioritySchema,
    scenario: ScenarioSchema,
    carbonAssumption: CarbonAssumptionSchema.nullable(),
  })
  .strict()

// Keep the provider schema within the Structured Outputs subset. Apply display
// length limits separately after parsing, and to browser storage on every read.
export const ExplanationWireSchema = z
  .object({
    title: z.string(),
    analogy: z
      .object({ id: AnalogyIdSchema, template: z.string() })
      .strict()
      .nullable(),
    paragraphs: z
      .array(
        z
          .object({
            text: z.string(),
            evidenceIds: z.array(MetricIdSchema).min(1).max(3),
          })
          .strict(),
      )
      .min(1)
      .max(2),
    actionId: ActionIdSchema,
  })
  .strict()

export const ExplanationSchema = ExplanationWireSchema.extend({
  title: z.string().trim().min(1).max(80),
  analogy: z
    .object({
      id: AnalogyIdSchema,
      template: z.string().trim().min(1).max(320),
    })
    .strict()
    .nullable(),
  paragraphs: z
    .array(
      z
        .object({
          text: z.string().trim().min(1).max(400),
          evidenceIds: z.array(MetricIdSchema).min(1).max(3),
        })
        .strict(),
    )
    .min(1)
    .max(2),
})

export const InsightResultSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('stale-data'),
      dataVersion: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict(),
  z
    .object({
      kind: z.literal('content'),
      contextKey: z.string().max(1024),
      source: z.enum(['ai', 'deterministic']),
      explanation: ExplanationSchema,
      facts: z.array(InsightFactSchema),
      generatedAt: z.iso.datetime(),
      status: z.enum(['ready', 'disabled', 'unavailable', 'invalid-output']),
    })
    .strict(),
])

export type InsightRequest = z.infer<typeof InsightRequestSchema>
export type Explanation = z.infer<typeof ExplanationSchema>
export type InsightResult = z.infer<typeof InsightResultSchema>
export type MetricId = z.infer<typeof MetricIdSchema>
export type InsightAction = z.infer<typeof ActionIdSchema>
