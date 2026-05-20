'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'

export default function QuotationsPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 -ml-1 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <SectionHeader title="견적서 관리" level="page" className="flex-1" />
        <Button size="sm" onClick={() => {}}>
          <Plus size={14} />
          새 견적서
        </Button>
      </div>

      {/* 빈 상태 */}
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
          <FileText size={28} className="text-violet-400" />
        </div>
        <p className="text-sm font-medium text-text-primary">작성된 견적서가 없습니다</p>
        <p className="text-xs text-text-tertiary break-keep">
          새 견적서를 작성해 고객에게 발송해 보세요
        </p>
      </div>
    </div>
  )
}
