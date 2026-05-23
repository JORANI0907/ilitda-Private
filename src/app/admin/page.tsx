'use client'

import { useState, useEffect } from 'react'
import { Users, CreditCard, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'

interface DashboardData {
  totalAccounts: number
  activePlans: number
  pendingPayments: number
}

interface PlanDistribution {
  free: number
  basic: number
  pro: number
  max: number
}

interface RecentSignup {
  id: string
  business_name: string
  plan_type: string
  created_at: string
}

interface StatsData {
  planDistribution: PlanDistribution
  recentSignups: RecentSignup[]
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
  {
    title: '플랜 분포',
    content: '전체 계정 중 각 플랜(Free/Basic/Pro/Max)의 비율을 막대 그래프로 표시합니다.',
  },
  {
    title: '최근 가입 계정',
    content: '가장 최근에 가입한 5개 계정을 보여줍니다. 상세 정보는 계정 관리 탭에서 확인하세요.',
  },
]

const PLAN_COLORS: Record<string, { bar: string; badge: string; label: string }> = {
  free:  { bar: 'bg-gray-400',    badge: 'bg-surface-sunken text-text-secondary border border-border', label: 'Free'  },
  basic: { bar: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-700',                                   label: 'Basic' },
  pro:   { bar: 'bg-violet-500',  badge: 'bg-violet-100 text-violet-700',                               label: 'Pro'   },
  max:   { bar: 'bg-orange-400',  badge: 'bg-orange-100 text-orange-700',                               label: 'Max'   },
}

function PlanBadge({ plan }: { plan: string }) {
  const config = PLAN_COLORS[plan] ?? PLAN_COLORS.free
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${config.badge}`}>
      {config.label}
    </span>
  )
}

function formatDate(dateStr: string) {
  return dateStr.slice(0, 10).replace(/-/g, '.')
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [accountsRes, paymentsRes, statsRes] = await Promise.all([
          fetch('/api/admin/accounts'),
          fetch('/api/admin/payments'),
          fetch('/api/admin/stats'),
        ])
        const accountsJson = await accountsRes.json()
        const paymentsJson = await paymentsRes.json()
        const statsJson = await statsRes.json()

        const businesses = accountsJson.data ?? []
        const payments = paymentsJson.data ?? []

        setData({
          totalAccounts: businesses.length,
          activePlans: businesses.filter((b: { plan: string }) => b.plan !== 'free').length,
          pendingPayments: payments.filter((p: { status: string }) => p.status === 'pending').length,
        })

        if (statsJson.success) {
          setStats({
            planDistribution: statsJson.data.planDistribution,
            recentSignups: statsJson.data.recentSignups,
          })
        }
      } catch {
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

  const total = stats
    ? Object.values(stats.planDistribution).reduce((s, n) => s + n, 0)
    : 0

  const planOrder: Array<keyof PlanDistribution> = ['free', 'basic', 'pro', 'max']

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-24">
      <SectionHeader title="관리자 대시보드" level="page" />

      <HelpBanner label="관리자 대시보드 사용법 보기" onClick={() => setHelpOpen(true)} />
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="관리자 대시보드 사용법"
        sections={DASHBOARD_HELP_SECTIONS}
      />

      {/* 요약 카드 3개 */}
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

      {/* 플랜 분포 */}
      <div className="flex flex-col gap-3">
        <SectionHeader title="플랜 분포" level="section" />
        <Card padding="md">
          {isLoading || !stats ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-10 bg-surface-sunken rounded animate-pulse shrink-0" />
                  <div className="flex-1 h-4 bg-surface-sunken rounded animate-pulse" />
                  <div className="h-4 w-6 bg-surface-sunken rounded animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {planOrder.map(key => {
                const count = stats.planDistribution[key]
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                const config = PLAN_COLORS[key]
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-text-secondary w-10 shrink-0 text-right">
                      {config.label}
                    </span>
                    <div className="flex-1 h-3 bg-surface-sunken rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${config.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-tertiary w-10 shrink-0 text-right">
                      {count}명 ({pct}%)
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* 최근 가입 */}
      <div className="flex flex-col gap-3">
        <SectionHeader title="최근 가입 계정 (최근 5개)" level="section" />
        <div className="flex flex-col gap-2">
          {isLoading || !stats ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} padding="sm">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-32 bg-surface-sunken rounded animate-pulse" />
                  <div className="h-5 w-12 bg-surface-sunken rounded-full animate-pulse" />
                  <div className="ml-auto h-4 w-20 bg-surface-sunken rounded animate-pulse" />
                </div>
              </Card>
            ))
          ) : (
            stats.recentSignups.map(signup => (
              <Card key={signup.id} padding="sm">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-text-primary truncate flex-1 min-w-0">
                    {signup.business_name}
                  </p>
                  <PlanBadge plan={signup.plan_type} />
                  <span className="text-xs text-text-tertiary shrink-0">
                    {formatDate(signup.created_at)}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
