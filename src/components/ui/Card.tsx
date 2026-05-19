'use client'

import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  padding?: 'none' | 'sm' | 'md'
}

export function Card({ children, className = '', onClick, padding = 'md' }: CardProps) {
  const paddingStyles = {
    none: '',
    sm:   'p-3',
    md:   'p-4',
  }

  return (
    <div
      className={`
        bg-surface rounded-2xl shadow-soft border border-border-subtle
        ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform hover:shadow-card' : ''}
        ${paddingStyles[padding]}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
