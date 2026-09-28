import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { EnergyRequestSchema } from '../../domain/energy/schema'

export const getEnergyWindow = createServerFn({ method: 'GET' })
  .inputValidator(EnergyRequestSchema)
  .handler(async ({ data }) => {
    setResponseHeader('Cache-Control', 'private, no-store')
    const { loadEnergyWindow } = await import('../services/energy.server')
    return loadEnergyWindow(data)
  })
