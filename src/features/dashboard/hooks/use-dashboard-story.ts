import { useMemo } from 'react'
import {
  type CarbonAssumption,
  calculateFacts,
  type EnergyWindow,
  formatDate,
  formatEnergy,
  formatMoney,
  type Scenario,
} from '../../../domain/energy'
import type { Priority } from '../../../domain/preferences/schema'

export function useDashboardStory(
  window: EnergyWindow,
  priority: Priority,
  scenario: Scenario,
  carbon: CarbonAssumption | null,
) {
  return useMemo(() => {
    const facts = calculateFacts(window, scenario, carbon ?? undefined)
    const peak = facts.find(
      (fact) =>
        fact.id === 'consumption.peak-day' && fact.status === 'available',
    )
    const savings = facts.find(
      (fact) =>
        fact.id === 'scenario.saved-energy' && fact.status === 'available',
    )
    const carbonFact = facts.find(
      (fact) =>
        fact.id === 'scenario.carbon-equivalent' && fact.status === 'available',
    )
    if (priority === 'money') {
      if (
        savings?.status === 'available' &&
        savings.id === 'scenario.saved-energy' &&
        savings.value.savedWh > 0
      )
        return {
          eyebrow: 'Your money snapshot',
          title: `What if you had saved ${formatMoney(savings.value.savedWh)}?`,
          description: `Your ${scenario.reductionPercent}% evening reduction would use ${formatEnergy(savings.value.savedWh)} fewer kWh in this period, at a flat $0.14/kWh.`,
          actionLabel: 'Adjust your scenario',
          action: 'adjust-scenario' as const,
        }
      return {
        eyebrow: 'Your money snapshot',
        title: `${formatMoney(window.totals.consumptionWh)} in estimated electricity costs.`,
        description:
          'Small changes add up. Explore what using less energy in the evening could mean for this household.',
        actionLabel: 'Explore savings',
        action: 'adjust-scenario' as const,
      }
    }
    if (priority === 'carbon') {
      if (
        carbonFact?.status === 'available' &&
        carbonFact.id === 'scenario.carbon-equivalent'
      )
        return {
          eyebrow: 'Your climate snapshot',
          title: `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(carbonFact.value.kgCo2e)} kg CO₂e less, under your assumption.`,
          description: `A hypothetical effect of your evening reduction, using ${carbonFact.value.kgCo2ePerKwh} kg CO₂e/kWh. Measured energy; assumption-based emissions.`,
          actionLabel: 'Review assumption',
          action: 'set-carbon-factor' as const,
        }
      return {
        eyebrow: 'Your climate snapshot',
        title: 'Understanding your footprint starts with energy.',
        description:
          'Explore your consumption first. Add an emissions factor to see the potential carbon effect of a reduction scenario.',
        actionLabel: 'Explore carbon impact',
        action: 'set-carbon-factor' as const,
      }
    }
    if (peak?.status === 'available' && peak.id === 'consumption.peak-day')
      return {
        eyebrow: 'Your energy snapshot',
        title: `${formatDate(peak.value.date, { month: 'long', day: 'numeric' })} was your biggest-use day.`,
        description: `${formatEnergy(peak.value.consumptionWh)} kWh recorded that day. Explore the patterns behind this household’s energy story.`,
        actionLabel: 'Explore patterns',
        action: 'view-history' as const,
      }
    return {
      eyebrow: 'Your energy snapshot',
      title: 'Get to know your energy patterns.',
      description:
        'Switch between daily totals and a typical day to see when this household uses electricity.',
      actionLabel: 'Explore patterns',
      action: 'view-history' as const,
    }
  }, [window, priority, scenario, carbon])
}
