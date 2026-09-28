import type { EnergyAnalogy } from './analogies'
import type { Explanation } from './schema'

const PLACEHOLDER = '{equivalent}'
const QUANTITY_WORDS =
  /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|billion|once|twice|thrice|double|triple|half|quarter|third|percent|percentage|times|multiply|multiplied)\b/i

export function analogyOptions(comparisons: EnergyAnalogy[]): EnergyAnalogy[] {
  const savings = comparisons.find((item) => item.id === 'scenario-ev-battery')
  return savings ? [savings] : comparisons
}

export function validAnalogy(
  analogy: Explanation['analogy'],
  comparisons: EnergyAnalogy[],
): boolean {
  if (!comparisons.length) return analogy === null
  if (!analogy || !comparisons.some((item) => item.id === analogy.id))
    return false
  const parts = analogy.template.split(PLACEHOLDER)
  const prose = parts.join('')
  // The model writes the sentence; application code inserts the entire
  // quantity and unit. Reject extra placeholders and model-authored numbers.
  if (
    parts.length !== 2 ||
    /[{}\p{N}%×]/u.test(prose) ||
    QUANTITY_WORDS.test(prose)
  )
    return false
  // Reject common scope changes as well as invented arithmetic. The canonical
  // scope and assumptions remain visible; free prose still needs human review.
  return analogy.id === 'scenario-ev-battery'
    ? /\bselected period\b/i.test(prose) &&
        !/\b(day|days|daily|week\w*|month\w*|year\w*|annual\w*|night\w*)\b/i.test(
          prose,
        )
    : /\baverage\b/i.test(prose) &&
        !/\b(sav\w*|scenario|period|week\w*|month\w*|year\w*|annual\w*)\b/i.test(
          prose,
        )
}

export function renderAnalogy(
  analogy: Explanation['analogy'],
  comparisons: EnergyAnalogy[],
): { text: string; comparison: EnergyAnalogy } | null {
  if (!analogy || !validAnalogy(analogy, comparisons)) return null
  const comparison = comparisons.find((item) => item.id === analogy.id)
  if (!comparison) return null
  return {
    text: analogy.template.replace(PLACEHOLDER, comparison.equivalent),
    comparison,
  }
}
