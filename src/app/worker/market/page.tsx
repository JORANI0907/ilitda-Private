'use client'

import { Briefcase } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/SectionHeader'

export default function WorkerMarketPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <SectionHeader
        title="일감 마켓"
        level="page"
        description="일감 구인구직 플랫폼"
      />

      {/* 오픈 예정 배너 */}
      <EmptyState
        icon={<Briefcase size={40} />}
        title="구인구직 마켓 오픈 예정"
        description="약 5개월 후 오픈 예정입니다. 조금만 기다려 주세요!"
        size="lg"
      />

      {/* 광고 슬롯 자리 */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">광고</p>
        <div className="h-24 rounded-2xl bg-surface-sunken border border-dashed border-border flex items-center justify-center">
          <p className="text-sm text-text-tertiary">광고 슬롯 (준비 중)</p>
        </div>
        <div className="h-24 rounded-2xl bg-surface-sunken border border-dashed border-border flex items-center justify-center">
          <p className="text-sm text-text-tertiary">광고 슬롯 (준비 중)</p>
        </div>
      </div>

      <div className="h-4" />
    </div>
  )
}
