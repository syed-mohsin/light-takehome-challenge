import type { ReactNode } from 'react'
import { useId } from 'react'

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  icon?: ReactNode
}

type SegmentedControlProps<T extends string> = {
  label: string
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
  className?: string
  showLabel?: boolean
  variant?: 'compact' | 'priority'
  disabled?: boolean
  id?: string
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className = '',
  showLabel = false,
  variant = 'compact',
  disabled = false,
  id,
}: SegmentedControlProps<T>) {
  const name = useId()
  const isPriority = variant === 'priority'

  return (
    <fieldset id={id} disabled={disabled} className={`min-w-0 ${className}`}>
      <legend
        className={
          showLabel ? 'mb-2 text-sm font-medium text-muted' : 'sr-only'
        }
      >
        {label}
      </legend>
      <div
        className={`inline-flex max-w-full flex-wrap items-center gap-1 rounded-control ${isPriority ? '' : 'border border-line bg-canvas p-1'}`}
      >
        {options.map((option) => (
          <label key={option.value} className="relative flex cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              onClick={() => {
                // Native change events do not fire when confirming the selected default.
                if (value === option.value) onChange(option.value)
              }}
              className="peer sr-only"
            />
            <span
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-3 py-2 text-xs font-semibold text-muted transition-colors peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-card peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus peer-disabled:cursor-not-allowed peer-disabled:opacity-50 ${isPriority ? 'px-4 text-sm peer-checked:[&_svg]:text-accent-ink' : ''}`}
            >
              {option.icon}
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
