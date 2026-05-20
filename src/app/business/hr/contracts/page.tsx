'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, FilePen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'

export default function ContractsPage() {
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
        <SectionHeader title="계약서 관리" level="page" className="flex-1" />
        <Button size="sm" onClick={() => {}}>
          <Plus size={14} />
          새 계약서
        </Button>
      </div>

      {/* 빈 상태 */}
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
          <FilePen size={28} className="text-amber-400" />
        </div>
        <p className="text-sm font-medium text-text-primary">등록된 계약서가 없습니다</p>
        <p className="text-xs text-text-tertiary break-keep">
          계약서를 작성하고 서명 이력을 관리해 보세요
        </p>
      </div>
    </div>
  )
}
