'use client'

import { ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  size?: 'sm' | 'md' | 'lg'
  bordered?: boolean
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  bordered = false,
  className = '',
}: EmptyStateProps) {
  const sizeStyles = {
    sm: 'py-8 gap-2',
    md: 'py-12 gap-3',
    lg: 'py-20 gap-4',
  }

  const iconSizeStyles = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  }

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center px-4
        ${sizeStyles[size]}
        ${bordered ? 'rounded-2xl border border-dashed border-border' : ''}
        ${className}
      `}
    >
      {icon && (
        <div className={`${iconSizeStyles[size]} text-text-tertiary flex items-center justify-center`}>
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="font-semibold text-text-primary">{title}</p>
        {description && (
          <p className="text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
