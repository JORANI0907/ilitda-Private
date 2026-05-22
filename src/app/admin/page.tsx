'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, CreditCard, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'

interface DashboardData {
  totalAccounts: number
  activePlans: number
  pendingPayments: number
}

const DASHBOARD_HELP_SECTIONS = [
  {
    title: '총 가입 계정',
    content: '일잇다에 가입한 사업자 계정의 총 수입니다. 계정 목록에서 각 계정의 상세 정보를 확인할 수 있어요.',
  },
  {
    title: '활성 플랜',
    content: 'Free 플랜을 제외하고 유료 플랜(Basic, Pro, Max)을 사용 중인 계정 수입니다. 플랜 변경은 계정 상세 화면에서 할 수 있어요.',
  },
  {
    title: '대기 중 입금',
    content: '아직 입금 확인이 완료되지 않은 결제 건수입니다. 입금 관리 화면에서 상태를 업데이트해주세요.',
  },
]

export default function AdminDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [accountsRes, paymentsRes] = await Promise.all([
          fetch('/api/admin/accounts'),
          fetch('/api/admin/payments'),
        ])
        const accountsJson = await accountsRes.json()
        const paymentsJson = await paymentsRes.json()

        const businesses = accountsJson.data ?? []
        const payments = paymentsJson.data ?? []

        setData({
          totalAccounts: businesses.length,
          activePlans: businesses.filter((b: { plan: string }) => b.plan !== 'free').length,
          pendingPayments: payments.filter((p: { status: string }) => p.status === 'pending').length,
        })
      } catch {
        // 로드 실패 시 기본값
        setData({ totalAccounts: 0, activePlans: 0, pendingPayments: 0 })
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const STAT_CARDS = [
    {
      icon: <Users size={22} />,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      label: '총 가입 계정',
      value: data?.totalAccounts ?? 0,
      unit: '개',
    },
    {
      icon: <CreditCard size={22} />,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      label: '활성 플랜',
      value: data?.activePlans ?? 0,
      unit: '개',
    },
    {
      icon: <Clock size={22} />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      label: '대기 중 입금',
      value: data?.pendingPayments ?? 0,
      unit: '건',
    },
  ]

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <SectionHeader title="관리자 대시보드" level="page" />

      <HelpBanner label="관리자 대시보드 사용법 보기" onClick={() => setHelpOpen(true)} />
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="관리자 대시보드 사용법"
        sections={DASHBOARD_HELP_SECTIONS}
      />

      <div className="flex flex-col gap-3">
        {STAT_CARDS.map(card => (
          <Card key={card.label} padding="md">
            <div className="flex items-center gap-4">
              <span className={`w-11 h-11 rounded-xl ${card.bg} ${card.color} flex items-center justify-center shrink-0`}>
                {card.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-secondary">{card.label}</p>
                {isLoading ? (
                  <div className="h-7 w-16 bg-surface-sunken rounded animate-pulse mt-0.5" />
                ) : (
                  <p className="text-2xl font-bold text-text-primary leading-tight">
                    {card.value.toLocaleString('ko-KR')}
                    <span className="text-base font-normal text-text-secondary ml-1">{card.unit}</span>
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Button
          variant="secondary"
          fullWidth
          onClick={() => router.push('/admin/accounts')}
        >
          <Users size={16} />
          계정 목록 보기
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => router.push('/admin/payments')}
        >
          <CreditCard size={16} />
          입금 관리 보기
        </Button>
        <Button
          variant="ghost"
          fullWidth
          onClick={() => router.push('/business/applications')}
        >
          서비스 관리로 이동
        </Button>
      </div>
    </div>
  )
}
