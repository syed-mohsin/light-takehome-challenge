import type { ComponentProps } from 'react'

export function Skeleton({ className = '', ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={`animate-pulse rounded-control bg-line/65 motion-reduce:animate-none ${className}`}
      aria-hidden="true"
      {...props}
    />
  )
}
