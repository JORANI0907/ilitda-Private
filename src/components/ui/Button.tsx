'use client'

import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  fullWidth?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  fullWidth,
  className = '',
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary:   'bg-brand-600 hover:bg-brand-700 active:bg-brand-700 text-white',
    secondary: 'bg-surface-sunken hover:bg-border text-text-primary',
    danger:    'bg-state-danger hover:bg-red-700 text-white',
    ghost:     'hover:bg-surface-sunken text-text-secondary',
  }

  const sizeStyles = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }

  return (
    <button
      type="button"
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-colors active:scale-[0.98] transition-transform
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]} ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
      disabled={isLoading || props.disabled}
    >
      {isLoading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
