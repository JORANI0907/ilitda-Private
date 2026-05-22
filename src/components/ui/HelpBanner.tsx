'use client'

import { BookOpen, ChevronRight } from 'lucide-react'

interface HelpBannerProps {
  onClick: () => void
  label?: string
  className?: string
}

export function HelpBanner({ onClick, label = '이 페이지 사용 방법 보기', className = '' }: HelpBannerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-100 active:bg-blue-100 transition-colors ${className}`}
    >
      <BookOpen size={14} className="shrink-0 text-blue-500" />
      <span className="flex-1 text-left text-[12px] font-medium text-blue-600">{label}</span>
      <span className="text-[11px] text-blue-400 flex items-center gap-0.5 shrink-0">
        탭하여 보기
        <ChevronRight size={11} />
      </span>
    </button>
  )
}
