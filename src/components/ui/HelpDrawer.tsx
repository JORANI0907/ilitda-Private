'use client'

import { useEffect, ReactNode } from 'react'
import { X } from 'lucide-react'

interface HelpSection {
  title: string
  content: string | ReactNode
}

interface HelpDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  sections: HelpSection[]
}

export function HelpDrawer({ open, onClose, title, sections }: HelpDrawerProps) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* 백드롭 */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* 바텀 시트 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] flex flex-col rounded-t-2xl bg-bg-primary shadow-modal">
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border-strong" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle shrink-0">
          <h2 className="text-[15px] font-semibold text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-surface-sunken text-text-tertiary"
          >
            <X size={16} />
          </button>
        </div>

        {/* 스크롤 콘텐츠 */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {sections.map((sec, i) => (
            <div key={i}>
              <p className="text-[13px] font-semibold text-text-primary mb-1.5">{sec.title}</p>
              {typeof sec.content === 'string' ? (
                <p className="text-[12px] leading-relaxed text-text-secondary whitespace-pre-line">{sec.content}</p>
              ) : (
                <div className="text-[12px] leading-relaxed text-text-secondary">{sec.content}</div>
              )}
            </div>
          ))}
          {/* 안전 여백 */}
          <div className="h-6" />
        </div>
      </div>
    </>
  )
}
