'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CreditCard, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/SectionHeader'

interface Payment {
  id: string
  business_id: string
  plan_name: string
  current_plan: string | null
  request_type: string | null
  amount: number
  depositor_name: string
  status: string
  confirmed_at: string | null
  created_at: string
  business_name: string | null
  business_plan_expires_at: string | null
}

const REQUEST_TYPE_STYLE: Record<string, { label: string; className: string }> = {
  upgrade:  { label: '업그레이드', className: 'bg-green-100 text-green-700' },
  renewal:  { label: '갱신',       className: 'bg-blue-100 text-blue-700' },
  downgrade:{ label: '하향',       className: 'bg-orange-100 text-orange-700' },
}

function RequestTypeBadge({ type }: { type: string | null }) {
  const style = REQUEST_TYPE_STYLE[type ?? ''] ?? { label: type ?? '신청', className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  )
}

function PlanFlow({ from, to }: { from: string | null; to: string }) {
  if (!from || from === to) return <span className="text-sm font-medium text-text-primary">{to.toUpperCase()}</span>
  return (
    <span className="flex items-center gap-1 text-sm font-medium text-text-primary">
      <span className="text-text-tertiary">{from.toUpperCase()}</span>
      <ArrowRight size={12} className="text-text-tertiary" />
      <span>{to.toUpperCase()}</span>
    </span>
  )
}

function formatDate(dateStr: string) {
  return dateStr.replace('T', ' ').slice(0, 16)
}

function formatKoreanDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

function getConfirmButtonLabel(requestType: string | null) {
  if (requestType === 'renewal') return '확인 (만료일 +30일)'
  if (requestType === 'downgrade') return '확인 (하향 적용)'
  return '확인 (30일 활성화)'
}

function PendingPaymentCard({
  payment,
  onConfirmClick,
  isConfirming,
}: {
  payment: Payment
  onConfirmClick: (p: Payment) => void
  isConfirming: boolean
}) {
  return (
    <Card padding="md">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-text-primary">{payment.business_name ?? '(업체명 없음)'}</p>
            <PlanFlow from={payment.current_plan} to={payment.plan_name} />
            <p className="text-sm text-text-secondary">{payment.amount.toLocaleString('ko-KR')}원</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
              대기중
            </span>
            <RequestTypeBadge type={payment.request_type} />
          </div>
        </div>

        {payment.request_type === 'downgrade' && payment.business_plan_expires_at && (
          <div className="flex items-start gap-2 rounded-xl bg-orange-50 border border-orange-100 p-3">
            <span className="text-orange-500 text-base leading-none mt-0.5">⚠️</span>
            <p className="text-xs text-orange-700 leading-normal">
              현재 플랜 만료일({formatKoreanDate(payment.business_plan_expires_at)}) 이후에 확인 처리하세요.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1 text-sm text-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="text-text-tertiary text-xs w-14 shrink-0">입금자명</span>
            <span className="font-medium text-text-primary">{payment.depositor_name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-tertiary text-xs w-14 shrink-0">신청일</span>
            <span>{formatDate(payment.created_at)}</span>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => onConfirmClick(payment)}
          isLoading={isConfirming}
          disabled={isConfirming}
        >
          <CheckCircle size={14} />
          {getConfirmButtonLabel(payment.request_type)}
        </Button>
      </div>
    </Card>
  )
}

function ConfirmedPaymentCard({ payment }: { payment: Payment }) {
  return (
    <Card padding="sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {payment.business_name ?? '(업체명 없음)'}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            <PlanFlow from={payment.current_plan} to={payment.plan_name} />
            {' · '}{payment.amount.toLocaleString('ko-KR')}원
            {' · '}{payment.depositor_name}
          </p>
          {payment.confirmed_at && (
            <p className="text-xs text-text-tertiary">{formatDate(payment.confirmed_at)} 확인</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            완료
          </span>
          {payment.request_type && <RequestTypeBadge type={payment.request_type} />}
        </div>
      </div>
    </Card>
  )
}

export default function AdminPaymentsPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<Payment | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const loadPayments = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/payments')
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '불러오기 실패')
        return
      }
      setPayments(json.data ?? [])
    } catch {
      setError('네트워크 오류')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadPayments() }, [loadPayments])

  function handleConfirmClick(payment: Payment) {
    setConfirmTarget(payment)
    setConfirmError(null)
  }

  async function handleConfirm() {
    if (!confirmTarget) return
    setConfirmingId(confirmTarget.id)
    setConfirmError(null)
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: confirmTarget.id, action: 'confirm' }),
      })
      const json = await res.json()
      if (!json.success) {
        setConfirmError(json.error ?? '처리 실패')
        return
      }
      setPayments(prev =>
        prev.map(p =>
          p.id === confirmTarget.id
            ? { ...p, status: 'confirmed', confirmed_at: new Date().toISOString() }
            : p
        )
      )
      setConfirmTarget(null)
    } catch {
      setConfirmError('네트워크 오류가 발생했습니다.')
    } finally {
      setConfirmingId(null)
    }
  }

  const pendingPayments = payments.filter(p => p.status === 'pending')
  const confirmedPayments = payments.filter(p => p.status === 'confirmed')

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
          title="입금 관리"
          description={`대기 ${pendingPayments.length}건`}
          level="page"
        />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="md">
              <div className="flex flex-col gap-2">
                <div className="h-5 w-40 bg-surface-sunken rounded animate-pulse" />
                <div className="h-4 w-28 bg-surface-sunken rounded animate-pulse" />
                <div className="h-9 w-full bg-surface-sunken rounded-lg animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-state-danger">{error}</p>
          <Button variant="secondary" size="sm" onClick={loadPayments}>
            재시도
          </Button>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="flex flex-col gap-4">
            <SectionHeader title="대기 중" level="section" />
            {pendingPayments.length === 0 ? (
              <EmptyState
                icon={<CreditCard size={32} />}
                title="대기 중인 입금이 없습니다"
                bordered
              />
            ) : (
              <div className="flex flex-col gap-3">
                {pendingPayments.map(p => (
                  <PendingPaymentCard
                    key={p.id}
                    payment={p}
                    onConfirmClick={handleConfirmClick}
                    isConfirming={confirmingId === p.id}
                  />
                ))}
              </div>
            )}
          </div>

          {confirmedPayments.length > 0 && (
            <div className="flex flex-col gap-3">
              <SectionHeader title="확인 완료" level="section" />
              <div className="flex flex-col gap-2">
                {confirmedPayments.map(p => (
                  <ConfirmedPaymentCard key={p.id} payment={p} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 확인 모달 */}
      <Modal
        open={!!confirmTarget}
        onClose={() => { if (!confirmingId) { setConfirmTarget(null); setConfirmError(null) } }}
        title="입금 확인"
        disableOverlayClose={!!confirmingId}
        footer={
          <>
            <Button
              fullWidth
              isLoading={!!confirmingId}
              onClick={handleConfirm}
            >
              {getConfirmButtonLabel(confirmTarget?.request_type ?? null)}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              disabled={!!confirmingId}
              onClick={() => { setConfirmTarget(null); setConfirmError(null) }}
            >
              취소
            </Button>
          </>
        }
      >
        {confirmTarget && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5 rounded-xl bg-surface-sunken p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-text-tertiary">업체명</span>
                <span className="font-medium text-text-primary">{confirmTarget.business_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">신청 유형</span>
                <RequestTypeBadge type={confirmTarget.request_type} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-tertiary">플랜</span>
                <PlanFlow from={confirmTarget.current_plan} to={confirmTarget.plan_name} />
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">입금자명</span>
                <span className="font-medium text-text-primary">{confirmTarget.depositor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">금액</span>
                <span className="font-bold text-brand-600">{confirmTarget.amount.toLocaleString('ko-KR')}원</span>
              </div>
            </div>

            {confirmTarget.request_type === 'upgrade' && confirmTarget.business_plan_expires_at && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3">
                <span className="text-amber-500 text-base leading-none mt-0.5">ℹ️</span>
                <p className="text-xs text-amber-700 leading-normal">
                  업그레이드 확인 즉시 새로운 30일이 시작됩니다. (기존 만료일 소멸)
                </p>
              </div>
            )}

            {confirmTarget.request_type === 'renewal' && (
              <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3">
                <span className="text-blue-500 text-base leading-none mt-0.5">📅</span>
                <p className="text-xs text-blue-700 leading-normal">
                  현재 만료일{confirmTarget.business_plan_expires_at ? `(${formatKoreanDate(confirmTarget.business_plan_expires_at)})` : ''}에서 30일이 연장됩니다.
                </p>
              </div>
            )}

            {confirmTarget.request_type === 'downgrade' && (
              <div className="flex items-start gap-2 rounded-xl bg-orange-50 border border-orange-100 p-3">
                <span className="text-orange-500 text-base leading-none mt-0.5">⚠️</span>
                <p className="text-xs text-orange-700 leading-normal">
                  하향 신청입니다. 현재 플랜 만료일({confirmTarget.business_plan_expires_at ? formatKoreanDate(confirmTarget.business_plan_expires_at) : '미설정'}) 이후에 처리하세요.
                </p>
              </div>
            )}

            {confirmError && (
              <p className="text-xs text-state-danger text-center">{confirmError}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
