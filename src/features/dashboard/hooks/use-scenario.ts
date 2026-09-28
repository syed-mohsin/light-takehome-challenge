import { useMemo, useState } from 'react'
import { ScenarioSchema } from '../../../domain/energy'

export function useScenario(context: string) {
  const [state, setState] = useState({ context, percentage: 0 })
  const reductionPercent = state.context === context ? state.percentage : 0
  // A dataset/date change starts a new experiment even after navigating back.
  if (state.context !== context) setState({ context, percentage: 0 })
  const scenario = useMemo(
    () => ({ kind: 'reduce-evening' as const, reductionPercent }),
    [reductionPercent],
  )
  function setReductionPercent(value: number) {
    const parsed = ScenarioSchema.safeParse({
      kind: 'reduce-evening',
      reductionPercent: value,
    })
    if (parsed.success)
      setState({ context, percentage: parsed.data.reductionPercent })
  }
  return {
    scenario,
    setReductionPercent,
    reset: () => setReductionPercent(0),
  }
}
