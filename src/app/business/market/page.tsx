'use client'

import { useState, useContext } from 'react'
import { ShoppingBag, Megaphone, BarChart2, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'
import { usePlanType } from '@/hooks/usePlanType'
import { canUseFeature } from '@/lib/plan-features'
import { AuthContext } from '@/contexts/AuthContext'

const FEATURES = [
  {
    icon: <ShoppingBag size={24} className="text-brand-600" />,
    title: '오더 거래',
    description: '사업자 간 일거리를 공개하고 작업자를 매칭하는 마켓플레이스. 검증된 사업자끼리만 거래할 수 있어요.',
    badge: '3개월 후 오픈',
  },
  {
    icon: <Users size={24} className="text-state-success" />,
    title: '인력 거래',
    description: '필요한 전문 인력을 구하거나 남는 인력을 다른 사업자에게 임시 지원할 수 있는 플랫폼.',
    badge: '준비 중',
  },
  {
    icon: <BarChart2 size={24} className="text-state-info" />,
    title: '시세/통계',
    description: '지역별·업종별 청소 시세와 작업 통계를 확인해 합리적인 견적을 낼 수 있어요.',
    badge: '준비 중',
  },
]

const HELP_SECTIONS = [
  {
    title: '마켓플레이스란?',
    content: '사업자 간 일거리(오더)를 주고받거나, 전문 인력을 구하고 지원할 수 있는 B2B 거래 플랫폼입니다.',
  },
  {
    title: '오픈 일정',
    content: '현재 준비 중입니다. 오픈 시 앱 알림으로 먼저 안내해 드립니다.',
  },
  {
    title: '사용 가능 플랜',
    content: '마켓플레이스는 프로(Pro) 이상 플랜에서 이용할 수 있습니다. 스탠더드 플랜은 플랜 업그레이드가 필요합니다.',
  },
]

export default function MarketPage() {
  const { planType, isLoading: planLoading } = usePlanType()
  const auth = useContext(AuthContext)
  const isGuest = !auth?.isLoading && !auth?.user
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  if (!planLoading && !isGuest && !canUseFeature(planType, 'marketplace')) {
    return (
      <div className="flex flex-col gap-6 px-4 pt-6 pb-24">
        <SectionHeader title="마켓" level="page" />
        <UpgradeModal
          open={true}
          onClose={() => setUpgradeOpen(false)}
          featureName="마켓플레이스"
          requiredPlan="pro"
          currentPlan={planType}
        />
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <p className="text-sm text-text-secondary break-keep">프로 이상 플랜에서 이용할 수 있습니다.</p>
          <Button variant="secondary" size="sm" onClick={() => setUpgradeOpen(true)}>플랜 업그레이드 안내</Button>
        </div>
        {upgradeOpen && (
          <UpgradeModal
            open={upgradeOpen}
            onClose={() => setUpgradeOpen(false)}
            featureName="마켓플레이스"
            requiredPlan="pro"
            currentPlan={planType}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <SectionHeader title="마켓" level="page" />

      <HelpBanner label="마켓플레이스 안내" onClick={() => setHelpOpen(true)} />
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="마켓플레이스 안내"
        sections={HELP_SECTIONS}
      />

      <HelpTip>마켓플레이스는 현재 준비 중입니다. 오픈 시 알림을 보내드립니다.</HelpTip>

      {/* 오픈 예정 배너 */}
      <EmptyState
        icon={<Megaphone size={48} />}
        title="오더 마켓이 곧 열려요!"
        description="사업자 간 오더 거래, 인력 매칭, 시세 정보를 한 곳에서."
        size="md"
      />

      {/* 예정 기능 카드 */}
      <div className="flex flex-col gap-3">
        <SectionHeader title="예정 기능" level="sub" />
        {FEATURES.map((f) => (
          <Card key={f.title} padding="md">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-surface-sunken flex items-center justify-center">
                {f.icon}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-primary">{f.title}</span>
                  <span className="text-xs text-text-tertiary bg-surface-sunken px-2 py-0.5 rounded-full">
                    {f.badge}
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-normal break-keep">
                  {f.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 광고 슬롯 */}
      <div className="rounded-2xl bg-surface-sunken border border-dashed border-border h-28 flex items-center justify-center">
        <p className="text-sm text-text-tertiary">광고 슬롯</p>
      </div>

      <div className="h-4" />
    </div>
  )
}
