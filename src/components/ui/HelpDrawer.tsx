'use client'

import { useEffect, ReactNode } from 'react'
import { X, HelpCircle } from 'lucide-react'
import { useModalBackButton } from '@/hooks/useModalBackButton'

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
  useModalBackButton(open, onClose)

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
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* 바텀 시트 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] flex flex-col rounded-t-3xl bg-white">
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100">
              <HelpCircle size={15} className="text-blue-500" />
            </div>
            <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 active:bg-gray-200"
          >
            <X size={15} />
          </button>
        </div>

        {/* 스크롤 콘텐츠 */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
          {sections.map((sec, i) => (
            <div key={i} className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold shrink-0">
                  {i + 1}
                </span>
                <p className="text-[13px] font-semibold text-gray-800">{sec.title}</p>
              </div>
              {typeof sec.content === 'string' ? (
                <p className="text-[12px] leading-relaxed text-gray-600 whitespace-pre-line pl-7">{sec.content}</p>
              ) : (
                <div className="text-[12px] leading-relaxed text-gray-600 pl-7">{sec.content}</div>
              )}
            </div>
          ))}
          <div className="h-6" />
        </div>
      </div>
    </>
  )
}
