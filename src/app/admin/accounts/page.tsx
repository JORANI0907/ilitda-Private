'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'

interface BusinessAccount {
  id: string
  business_name: string
  registration_number: string | null
  plan: string
  plan_expires_at: string | null
  created_at: string
  profile: {
    name: string
    phone: string
  } | null
}

const PLAN_BADGE: Record<string, { label: string; className: string }> = {
  free:  { label: 'Free',  className: 'bg-surface-sunken text-text-secondary border border-border' },
  basic: { label: 'Basic', className: 'bg-blue-100 text-blue-700' },
  pro:   { label: 'Pro',   className: 'bg-violet-100 text-violet-700' },
}

function PlanBadge({ plan }: { plan: string }) {
  const badge = PLAN_BADGE[plan] ?? PLAN_BADGE.free
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
      {badge.label}
    </span>
  )
}

function formatDate(dateStr: string) {
  return dateStr.slice(0, 10)
}

function AccountCard({ account, onClick }: { account: BusinessAccount; onClick: () => void }) {
  return (
    <Card
      padding="md"
      className="cursor-pointer hover:border-brand-200 hover:bg-brand-50/30 hover:shadow-card active:scale-[0.98] transition-all"
      onClick={onClick}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-text-primary leading-tight break-keep">
            {account.business_name}
          </p>
          <PlanBadge plan={account.plan} />
        </div>

        <div className="flex flex-col gap-1 text-sm text-text-secondary">
          {account.profile && (
            <div className="flex items-center gap-1.5">
              <span className="text-text-tertiary text-xs w-12 shrink-0">대표자</span>
              <span>{account.profile.name}</span>
            </div>
          )}
          {account.profile?.phone && (
            <div className="flex items-center gap-1.5">
              <span className="text-text-tertiary text-xs w-12 shrink-0">전화번호</span>
              <span>{account.profile.phone}</span>
            </div>
          )}
          {account.registration_number && (
            <div className="flex items-center gap-1.5">
              <span className="text-text-tertiary text-xs w-12 shrink-0">사업자번호</span>
              <span>{account.registration_number}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-text-tertiary text-xs w-12 shrink-0">가입일</span>
            <span>{formatDate(account.created_at)}</span>
          </div>
          {account.plan !== 'free' && account.plan_expires_at && (
            <div className="flex items-center gap-1.5">
              <span className="text-text-tertiary text-xs w-12 shrink-0">만료일</span>
              <span>{account.plan_expires_at}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

const ACCOUNTS_HELP_SECTIONS = [
  {
    title: '계정 목록이란?',
    content: '일잇다에 가입한 사업자 계정 전체 목록입니다. 각 카드를 탭하면 상세 정보를 확인하고 수정할 수 있어요.',
  },
  {
    title: '플랜 배지 의미',
    content: 'Free: 무료 플랜\nBasic: 기본 유료 플랜\nPro: 프로 플랜\nMax: 최상위 플랜\n\n배지 색상으로 플랜을 빠르게 확인할 수 있습니다.',
  },
  {
    title: '계정 상세 수정 방법',
    content: '목록에서 계정 카드를 탭하면 상세 페이지로 이동합니다. 상호명, 플랜, 연락처 등을 수정하고 저장 버튼을 누르면 즉시 반영됩니다.',
  },
]

export default function AdminAccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<BusinessAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/accounts')
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '불러오기 실패')
        return
      }
      setAccounts(json.data ?? [])
    } catch {
      setError('네트워크 오류')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-24">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-sunken text-text-secondary hover:bg-border transition-colors shrink-0"
        >
          <ChevronLeft size={18} />
        </button>
        <SectionHeader
          title="계정 목록"
          description={`총 ${accounts.length}개 계정`}
          level="page"
        />
      </div>

      <HelpBanner label="계정 관리 사용법 보기" onClick={() => setHelpOpen(true)} />
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="계정 관리 사용법"
        sections={ACCOUNTS_HELP_SECTIONS}
      />

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} padding="md">
              <div className="flex flex-col gap-2">
                <div className="h-5 w-40 bg-surface-sunken rounded animate-pulse" />
                <div className="h-4 w-28 bg-surface-sunken rounded animate-pulse" />
                <div className="h-4 w-32 bg-surface-sunken rounded animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-state-danger">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            재시도
          </Button>
        </div>
      )}

      {!isLoading && !error && accounts.length === 0 && (
        <EmptyState
          icon={<Users size={40} />}
          title="등록된 계정이 없습니다"
          description="아직 가입한 계정이 없습니다."
          bordered
        />
      )}

      {!isLoading && !error && accounts.length > 0 && (
        <div className="flex flex-col gap-3">
          {accounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              onClick={() => router.push(`/admin/accounts/${account.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
