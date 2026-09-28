import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { InsightRequestSchema } from '../../domain/insights/schema'

export const getEnergyExplanation = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    if (new TextEncoder().encode(JSON.stringify(input)).byteLength > 2_048) {
      throw new Error('Explanation request is too large')
    }
    return InsightRequestSchema.parse(input)
  })
  .handler(async ({ data }) => {
    setResponseHeader('Cache-Control', 'private, no-store')
    const { explainEnergy } = await import('../services/insights.server')
    return explainEnergy(data)
  })
