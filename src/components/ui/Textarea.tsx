'use client'

import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className = '', id, ...props },
  ref,
) {
  const inputId = id ?? `ilitda-textarea-${(props.name ?? label ?? 'textarea').replace(/\s+/g, '-')}`

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        className={`
          block w-full rounded-md bg-surface
          border ${error ? 'border-state-danger' : 'border-border'}
          text-text-primary placeholder:text-text-tertiary
          px-4 py-3 text-sm leading-normal
          transition-colors resize-none
          focus:outline-none focus:ring-2 focus:ring-offset-0
          ${error
            ? 'focus:ring-state-danger/30 focus:border-state-danger'
            : 'focus:ring-brand-500/30 focus:border-brand-500'}
          disabled:bg-surface-sunken disabled:text-text-tertiary disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
      {(error || hint) && (
        <p className={`mt-1.5 text-xs ${error ? 'text-state-danger' : 'text-text-tertiary'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
})
