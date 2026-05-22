'use client'

import { ReactNode, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { useModalBackButton } from '@/hooks/useModalBackButton'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string | ReactNode
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** 바텀시트 스타일 (기본 true — 모바일 우선) */
  bottomSheet?: boolean
  showCloseButton?: boolean
  disableOverlayClose?: boolean
  className?: string
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  bottomSheet = true,
  showCloseButton = true,
  disableOverlayClose = false,
  className = '',
}: ModalProps) {
  const previousEl = useRef<Element | null>(null)

  const handleClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    if (!open) return
    previousEl.current = document.activeElement
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      if (previousEl.current instanceof HTMLElement) previousEl.current.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, handleClose])

  useModalBackButton(open, handleClose)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => { if (!disableOverlayClose) handleClose() }}
        aria-hidden="true"
      />

      {/* 다이얼로그 */}
      <div
        className={`
          relative w-full max-w-lg bg-surface shadow-modal
          ${bottomSheet
            ? 'rounded-t-3xl sm:rounded-2xl'
            : 'rounded-2xl mx-4'}
          flex flex-col max-h-[90vh] outline-none
          ${className}
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* 바텀시트 핸들 */}
        {bottomSheet && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
        )}

        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-4 pb-2">
            <div>
              {title && <h2 className="text-lg font-bold text-text-primary leading-snug">{title}</h2>}
              {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={handleClose}
                aria-label="닫기"
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:bg-surface-sunken"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {footer && (
          <div className="px-6 pb-6 pt-3 flex flex-col gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
