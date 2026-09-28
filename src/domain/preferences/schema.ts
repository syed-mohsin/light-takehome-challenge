import { z } from 'zod'

export const PrioritySchema = z.enum(['money', 'carbon', 'learning'])
export type Priority = z.infer<typeof PrioritySchema>

export const SavedPreferenceSchema = z.discriminatedUnion('onboarding', [
  z
    .object({
      version: z.literal(1),
      priority: PrioritySchema,
      onboarding: z.literal('chosen'),
    })
    .strict(),
  z
    .object({
      version: z.literal(1),
      priority: z.literal('money'),
      onboarding: z.literal('skipped'),
    })
    .strict(),
])
export type SavedPreference = z.infer<typeof SavedPreferenceSchema>

export const PreferenceViewSchema = z.object({
  priority: PrioritySchema,
  onboarding: z.enum(['unseen', 'chosen', 'skipped']),
})
export type PreferenceView = z.infer<typeof PreferenceViewSchema>

export const DEFAULT_PREFERENCE: PreferenceView = {
  priority: 'money',
  onboarding: 'unseen',
}
export const PREFERENCE_STORAGE_KEY = 'energy-preference'
