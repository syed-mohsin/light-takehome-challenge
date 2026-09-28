import { LoaderCircle } from 'lucide-react'
import type { ComponentProps } from 'react'

const variants = {
  primary: 'border-ink bg-ink text-white hover:bg-ink/90',
  secondary:
    'border-line bg-surface text-ink hover:border-control-line hover:bg-canvas',
  quiet:
    'border-transparent bg-transparent text-muted hover:bg-ink/5 hover:text-ink',
  accent: 'border-accent/20 bg-accent-soft text-accent-ink hover:bg-accent/20',
} as const

export type ButtonProps = ComponentProps<'button'> & {
  variant?: keyof typeof variants
  pending?: boolean
}

export function Button({
  children,
  className = '',
  variant = 'secondary',
  pending = false,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {pending && (
        <LoaderCircle
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
}
