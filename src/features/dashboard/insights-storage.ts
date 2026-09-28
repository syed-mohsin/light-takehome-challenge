import { z } from 'zod'
import type { InsightFact } from '../../domain/energy/schema'
import type { EnergyAnalogy } from '../../domain/insights/analogies'
import { validExplanation } from '../../domain/insights/presentation'
import {
  ExplanationSchema,
  type InsightRequest,
} from '../../domain/insights/schema'

const STORAGE_KEY = 'energy-insights'
const SavedExplanationSchema = z
  .object({
    contextKey: z.string().max(1024),
    explanation: ExplanationSchema,
    generatedAt: z.iso.datetime(),
  })
  .strict()
const StorageSchema = z
  .object({
    version: z.literal(1),
    entries: z.array(SavedExplanationSchema).max(10),
  })
  .strict()
export type SavedExplanation = z.infer<typeof SavedExplanationSchema>

function readEntries(): SavedExplanation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw || raw.length > 64_000) return []
    const result = StorageSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data.entries : []
  } catch {
    return []
  }
}

export function readSavedExplanation(
  contextKey: string,
  facts: InsightFact[],
  request: InsightRequest,
  comparisons: EnergyAnalogy[],
): SavedExplanation | null {
  const entry = readEntries().find(
    (candidate) => candidate.contextKey === contextKey,
  )
  if (
    !entry ||
    !validExplanation(entry.explanation, facts, request, comparisons)
  )
    return null
  return entry
}

export function saveExplanation(entry: SavedExplanation): void {
  if (typeof window === 'undefined') return
  const parsed = SavedExplanationSchema.safeParse(entry)
  if (!parsed.success) return
  try {
    const entries = readEntries().filter(
      (item) => item.contextKey !== entry.contextKey,
    )
    entries.push(parsed.data)
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        entries: entries.slice(-10),
      }),
    )
  } catch {
    // The current explanation stays visible even when it cannot be saved.
  }
}
