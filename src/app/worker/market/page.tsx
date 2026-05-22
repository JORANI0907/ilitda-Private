'use client'

import { useState } from 'react'
import { Briefcase } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'

const HELP_SECTIONS = [
  {
    title: '작업자 마켓이란?',
    content: '작업자가 직접 일감을 구하거나, 남는 시간에 다른 사업자의 일감에 지원할 수 있는 구인구직 플랫폼입니다.',
  },
  {
    title: '오픈 일정',
    content: '현재 준비 중입니다. 오픈 시 앱 알림으로 먼저 안내해 드립니다.',
  },
]

export default function WorkerMarketPage() {
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <SectionHeader
        title="일감 마켓"
        level="page"
        description="일감 구인구직 플랫폼"
      />

      <HelpBanner label="작업자 마켓 안내" onClick={() => setHelpOpen(true)} />
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="작업자 마켓 안내"
        sections={HELP_SECTIONS}
      />

      <HelpTip>작업자 마켓은 현재 준비 중입니다.</HelpTip>

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
