'use client'

import { useState, useRef, useEffect } from 'react'
import { Info, X } from 'lucide-react'

interface HelpIconProps {
  title: string
  description: string
  className?: string
}

export function HelpIcon({ title, description, className = '' }: HelpIconProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [open])

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-500 hover:bg-blue-200 active:bg-blue-300 transition-colors"
        aria-label="도움말 보기"
      >
        <Info size={10} strokeWidth={2.5} />
      </button>

      {open && (
        <div className="absolute z-50 left-5 top-0 w-64 rounded-xl shadow-lg border border-border-primary bg-bg-primary p-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-[12px] font-semibold text-text-primary leading-tight">{title}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 text-text-tertiary hover:text-text-secondary"
            >
              <X size={12} />
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-text-secondary whitespace-pre-line">{description}</p>
        </div>
      )}
    </div>
  )
}
