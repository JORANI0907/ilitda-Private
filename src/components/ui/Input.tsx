'use client'

import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    leadingIcon,
    trailingIcon,
    size = 'md',
    fullWidth = true,
    className = '',
    id,
    ...props
  },
  ref,
) {
  const sizeStyles = {
    sm: 'h-9 text-sm px-3',
    md: 'h-12 text-base px-4',
    lg: 'h-14 text-base px-4',
  }

  const inputId = id ?? `ilitda-input-${(props.name ?? label ?? 'input').replace(/\s+/g, '-')}`

  return (
    <div className={fullWidth ? 'w-full' : 'inline-block'}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-text-tertiary pointer-events-none">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={`
            block w-full rounded-md bg-surface
            border ${error ? 'border-state-danger' : 'border-border'}
            text-text-primary placeholder:text-text-tertiary
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-0
            ${error
              ? 'focus:ring-state-danger/30 focus:border-state-danger'
              : 'focus:ring-brand-500/30 focus:border-brand-500'}
            disabled:bg-surface-sunken disabled:text-text-tertiary disabled:cursor-not-allowed
            ${sizeStyles[size]}
            ${leadingIcon  ? 'pl-11' : ''}
            ${trailingIcon ? 'pr-11' : ''}
            ${className}
          `}
          {...props}
        />
        {trailingIcon && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-text-tertiary pointer-events-none">
            {trailingIcon}
          </span>
        )}
      </div>
      {(error || hint) && (
        <p className={`mt-1.5 text-xs ${error ? 'text-state-danger' : 'text-text-tertiary'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
})
