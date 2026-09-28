import { CircleAlert, Database, LoaderCircle } from 'lucide-react'
import { Button } from './button'
import { Card } from './card'

type StatusPanelProps = {
  kind: 'loading' | 'empty' | 'error'
  title: string
  description?: string
  onRetry?: () => void
}

export function StatusPanel({
  kind,
  title,
  description,
  onRetry,
}: StatusPanelProps) {
  const Icon =
    kind === 'loading'
      ? LoaderCircle
      : kind === 'error'
        ? CircleAlert
        : Database
  return (
    <Card className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <Icon
        className={`size-7 ${kind === 'error' ? 'text-danger' : 'text-muted'} ${kind === 'loading' ? 'animate-spin motion-reduce:animate-none' : ''}`}
        aria-hidden="true"
      />
      <div role={kind === 'error' ? 'alert' : 'status'}>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {description && (
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            {description}
          </p>
        )}
      </div>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </Card>
  )
}
