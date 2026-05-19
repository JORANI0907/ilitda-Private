'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoginPrompt } from '@/components/shared/LoginPrompt'
import { PayrollCard, PayrollCardSkeleton } from '@/components/business/PayrollCard'
import type { Payroll, Worker, Profile } from '@/types'

type Period = 'current' | 'last'

type PayrollWithWorker = Payroll & {
  worker: (Worker & {
    profile: Pick<Profile, 'name' | 'phone'> | null
  }) | null
}

export default function PayrollPage() {
  const [period, setPeriod] = useState<Period>('current')
  const [payrolls, setPayrolls] = useState<PayrollWithWorker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const fetchPayrolls = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/business/payroll?period=${period}`)
      const json = await res.json()
      if (!json.success) {
        if (res.status === 401) {
          setShowLoginPrompt(true)
          return
        }
        setError(json.error ?? '불러오기에 실패했습니다.')
        return
      }
      setPayrolls(json.data ?? [])
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchPayrolls()
  }, [fetchPayrolls])

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    try {
      const now = new Date()
      let start: string
      let end: string
      if (period === 'current') {
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
      } else {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
        end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
      }

      const res = await fetch('/api/business/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_start: start, period_end: end }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '급여 생성에 실패했습니다.')
        return
      }
      await fetchPayrolls()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleMarkPaid(id: string) {
    setPayingId(id)
    try {
      const res = await fetch('/api/business/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '상태 변경에 실패했습니다.')
        return
      }
      setPayrolls((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: 'paid', paid_at: new Date().toISOString() } : p
        )
      )
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setPayingId(null)
    }
  }

  const totalAmount = payrolls.reduce((s, p) => s + p.total_amount, 0)
  const pendingCount = payrolls.filter((p) => p.status === 'pending').length

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <SectionHeader
        title="급여 정산"
        level="page"
        action={
          <Button size="sm" variant="secondary" onClick={handleGenerate} isLoading={isGenerating}>
            <RefreshCw size={14} />
            급여 생성
          </Button>
        }
      />

      {/* 기간 탭 */}
      <div className="flex rounded-xl bg-surface-sunken p-1 gap-1">
        {([['current', '이번 달'], ['last', '지난 달']] as [Period, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={`
              flex-1 h-9 rounded-lg text-sm font-medium transition-colors
              ${period === key
                ? 'bg-surface text-text-primary shadow-soft'
                : 'text-text-secondary hover:text-text-primary'}
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 요약 */}
      {!isLoading && payrolls.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            미지급 {pendingCount}건
          </span>
          <span className="font-bold text-text-primary">
            총 {totalAmount.toLocaleString('ko-KR')}원
          </span>
        </div>
      )}

      {/* SMS 전체 발송 */}
      {!isLoading && payrolls.length > 0 && (
        <Button
          variant="secondary"
          fullWidth
          onClick={() => setShowLoginPrompt(true)}
        >
          <MessageSquare size={16} />
          전체 SMS 발송
        </Button>
      )}

      {error && (
        <p className="text-sm text-state-danger text-center">{error}</p>
      )}

      {/* 목록 */}
      <div className="flex flex-col gap-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <PayrollCardSkeleton key={i} />
        ))}

        {!isLoading && !error && payrolls.length === 0 && (
          <EmptyState
            icon={<RefreshCw size={40} />}
            title="급여 데이터가 없어요"
            description="급여 생성 버튼을 눌러 이번 달 급여를 계산하세요."
            bordered
          />
        )}

        {!isLoading && payrolls.map((p) => (
          <PayrollCard
            key={p.id}
            payroll={p}
            onMarkPaid={handleMarkPaid}
            isPaying={payingId === p.id}
          />
        ))}
      </div>

      <LoginPrompt
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="이 기능을 사용하려면 로그인이 필요합니다."
      />
    </div>
  )
}
