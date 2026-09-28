import { useEffect, useState } from 'react'
import {
  DEFAULT_PREFERENCE,
  PREFERENCE_STORAGE_KEY,
  type PreferenceView,
  type Priority,
  type SavedPreference,
  SavedPreferenceSchema,
} from '@/domain/preferences/schema'

export function usePreference() {
  const [preference, setPreference] =
    useState<PreferenceView>(DEFAULT_PREFERENCE)
  const [ready, setReady] = useState(false)
  const [storageUnavailable, setStorageUnavailable] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFERENCE_STORAGE_KEY)
      if (raw && raw.length <= 256) {
        try {
          const parsed = SavedPreferenceSchema.safeParse(JSON.parse(raw))
          if (parsed.success) {
            setPreference({
              priority: parsed.data.priority,
              onboarding: parsed.data.onboarding,
            })
          }
        } catch {
          // Invalid JSON is treated as a first visit, without writing over storage.
        }
      }
    } catch {
      setStorageUnavailable(true)
    }
    setReady(true)
  }, [])

  function save(record: SavedPreference) {
    setPreference({ priority: record.priority, onboarding: record.onboarding })
    try {
      localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(record))
      setStorageUnavailable(false)
    } catch {
      setStorageUnavailable(true)
    }
  }

  return {
    ...preference,
    ready,
    storageUnavailable,
    choose: (priority: Priority) =>
      save({ version: 1, priority, onboarding: 'chosen' }),
    skip: () => save({ version: 1, priority: 'money', onboarding: 'skipped' }),
  }
}
