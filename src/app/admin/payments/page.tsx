'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CreditCard, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/SectionHeader'

interface Payment {
  id: string
  business_id: string
  plan_name: string
  amount: number
  depositor_name: string
  status: string
  confirmed_at: string | null
  created_at: string
  business_name: string | null
}

function formatDate(dateStr: string) {
  return dateStr.replace('T', ' ').slice(0, 16)
}

function PendingPaymentCard({
  payment,
  onConfirm,
  isConfirming,
}: {
  payment: Payment
  onConfirm: (id: string) => void
  isConfirming: boolean
}) {
  return (
    <Card padding="md">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-text-primary">{payment.business_name ?? '(업체명 없음)'}</p>
            <p className="text-sm text-text-secondary mt-0.5">
              {payment.plan_name.toUpperCase()} 플랜 · {payment.amount.toLocaleString('ko-KR')}원
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 shrink-0">
            대기중
          </span>
        </div>

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
          onClick={() => onConfirm(payment.id)}
          isLoading={isConfirming}
          disabled={isConfirming}
        >
          <CheckCircle size={14} />
          확인 (30일 활성화)
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
            {payment.plan_name.toUpperCase()} · {payment.amount.toLocaleString('ko-KR')}원
            {' · '}{payment.depositor_name}
          </p>
          {payment.confirmed_at && (
            <p className="text-xs text-text-tertiary">{formatDate(payment.confirmed_at)} 확인</p>
          )}
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 shrink-0">
          완료
        </span>
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

  async function handleConfirm(paymentId: string) {
    const payment = payments.find(p => p.id === paymentId)
    if (!payment) return

    const confirmed = window.confirm(
      `${payment.business_name} 의 ${payment.plan_name.toUpperCase()} 플랜 신청을 확인하시겠습니까?\n입금자: ${payment.depositor_name} / 금액: ${payment.amount.toLocaleString('ko-KR')}원\n\n30일간 활성화됩니다.`
    )
    if (!confirmed) return

    setConfirmingId(paymentId)
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          action: 'confirm',
          planName: payment.plan_name,
          durationDays: 30,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        alert(json.error ?? '처리 실패')
        return
      }
      setPayments(prev =>
        prev.map(p =>
          p.id === paymentId
            ? { ...p, status: 'confirmed', confirmed_at: new Date().toISOString() }
            : p
        )
      )
    } catch {
      alert('네트워크 오류')
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
                    onConfirm={handleConfirm}
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
    </div>
  )
}
