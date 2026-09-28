import { Leaf, Lightbulb, PiggyBank } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { PreferenceView, Priority } from '@/domain/preferences/schema'

const options = [
  {
    value: 'money',
    label: 'Saving money',
    icon: <PiggyBank className="size-4" aria-hidden="true" />,
  },
  {
    value: 'carbon',
    label: 'Carbon footprint',
    icon: <Leaf className="size-4" aria-hidden="true" />,
  },
  {
    value: 'learning',
    label: 'Learning',
    icon: <Lightbulb className="size-4" aria-hidden="true" />,
  },
] as const

type PrioritySelectorProps = PreferenceView & {
  onChoose: (priority: Priority) => void
  onSkip: () => void
  storageUnavailable?: boolean
}

export function PrioritySelector({
  priority,
  onboarding,
  onChoose,
  onSkip,
  storageUnavailable,
}: PrioritySelectorProps) {
  const region = useRef<HTMLDivElement>(null)
  const unseen = onboarding === 'unseen'

  function skip() {
    onSkip()
    region.current
      ?.querySelector<HTMLInputElement>('input[value="money"]')
      ?.focus()
  }

  return (
    <div ref={region} className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs font-medium text-muted sm:text-sm">
          {unseen ? 'What matters most to you?' : 'Show me more about'}
        </p>
        <SegmentedControl
          label="Your energy priority"
          value={priority}
          options={options}
          onChange={onChoose}
          variant="priority"
        />
        {unseen && (
          <Button
            variant="quiet"
            className="px-2 text-xs sm:ml-auto"
            onClick={skip}
          >
            Skip for now
          </Button>
        )}
      </div>
      {storageUnavailable && (
        <output className="block text-xs text-muted">
          Your choice works for this visit, but this browser could not save it.
        </output>
      )}
    </div>
  )
}
