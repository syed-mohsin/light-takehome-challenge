import type { ReactNode } from 'react'
import { useId } from 'react'

type ControlProps = {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
}

type FieldProps = {
  label: string
  description?: string
  error?: string
  className?: string
  children: (props: ControlProps) => ReactNode
}

export function Field({
  label,
  description,
  error,
  className = '',
  children,
}: FieldProps) {
  const id = useId()
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`
  const describedBy = [description && descriptionId, error && errorId]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {description && (
        <p id={descriptionId} className="text-xs leading-5 text-muted">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs leading-5 text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
