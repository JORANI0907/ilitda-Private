'use client'

import { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  level?: 'page' | 'section' | 'sub'
  className?: string
}

export function SectionHeader({
  title,
  description,
  action,
  level = 'section',
  className = '',
}: SectionHeaderProps) {
  const levelStyles = {
    page: 'text-2xl font-bold text-text-primary',
    section: 'text-lg font-bold text-text-primary',
    sub: 'text-sm font-semibold text-text-secondary uppercase tracking-wide',
  }

  return (
    <div className={`flex items-start justify-between gap-2 ${className}`}>
      <div className="min-w-0">
        <h2 className={`${levelStyles[level]} leading-snug break-keep`}>{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
