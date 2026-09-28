import type { ComponentProps } from 'react'

const tones = {
  surface: 'bg-surface',
  positive: 'bg-positive-soft',
} as const

type CardProps = ComponentProps<'div'> & { tone?: keyof typeof tones }

export function Card({
  className = '',
  tone = 'surface',
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-card border border-line shadow-card ${tones[tone]} ${className}`}
      {...props}
    />
  )
}
