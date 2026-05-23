'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Users, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
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

function AccountCard({
  account,
  onClick,
  onDeleteClick,
}: {
  account: BusinessAccount
  onClick: () => void
  onDeleteClick: (e: React.MouseEvent) => void
}) {
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
          <div className="flex items-center gap-2 shrink-0">
            <PlanBadge plan={account.plan} />
            <button
              type="button"
              onClick={onDeleteClick}
              aria-label="계정 삭제"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-tertiary hover:text-state-danger hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
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
    title: '계정 추가 방법',
    content: '상단 [+ 계정 추가] 버튼을 누르면 회원가입 페이지로 이동합니다. 가입 완료 후 목록에 자동으로 나타납니다.',
  },
  {
    title: '계정 삭제 방법',
    content: '각 카드 오른쪽의 휴지통 아이콘을 탭하면 삭제 확인 창이 나타납니다. 삭제는 되돌릴 수 없으니 신중하게 진행하세요.',
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

  const [deleteTarget, setDeleteTarget] = useState<BusinessAccount | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/accounts/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) {
        setDeleteError(json.error ?? '삭제에 실패했습니다.')
        return
      }
      setDeleteTarget(null)
      setAccounts(prev => prev.filter(a => a.id !== deleteTarget.id))
    } catch {
      setDeleteError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

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
        <div className="flex-1 min-w-0">
          <SectionHeader
            title="계정 목록"
            description={`총 ${accounts.length}개 계정`}
            level="page"
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/login/register')}
          className="shrink-0 flex items-center gap-1.5"
        >
          <UserPlus size={15} />
          계정 추가
        </Button>
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
              onDeleteClick={(e) => {
                e.stopPropagation()
                setDeleteTarget(account)
                setDeleteError(null)
              }}
            />
          ))}
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { if (!isDeleting) { setDeleteTarget(null); setDeleteError(null) } }}
        title="계정 삭제"
        disableOverlayClose={isDeleting}
        footer={
          <>
            <Button
              variant="danger"
              fullWidth
              isLoading={isDeleting}
              onClick={handleDeleteConfirm}
            >
              삭제
            </Button>
            <Button
              variant="secondary"
              fullWidth
              disabled={isDeleting}
              onClick={() => { setDeleteTarget(null); setDeleteError(null) }}
            >
              취소
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-primary leading-normal">
            <span className="font-semibold">{deleteTarget?.business_name}</span> 계정을 삭제하시겠습니까?
          </p>
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3">
            <span className="text-state-danger text-base leading-none mt-0.5">⚠️</span>
            <p className="text-xs text-state-danger leading-normal">
              이 작업은 되돌릴 수 없습니다. 계정과 관련된 모든 데이터가 영구적으로 삭제됩니다.
            </p>
          </div>
          {deleteError && (
            <p className="text-xs text-state-danger text-center">{deleteError}</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
