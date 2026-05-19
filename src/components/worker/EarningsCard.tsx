'use client'

import { Clock, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { PayrollStatus } from '@/types'

interface EarningsCardProps {
  periodStart: string
  periodEnd: string
  totalAmount: number
  totalHours: number
  status: PayrollStatus
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  return `${s.getFullYear()}년 ${s.getMonth() + 1}월 ${s.getDate()}일 ~ ${e.getMonth() + 1}월 ${e.getDate()}일`
}

const PAYROLL_STATUS_MAP: Record<PayrollStatus, { label: string; variant: 'success' | 'warning' }> = {
  paid:    { label: '지급완료', variant: 'success' },
  pending: { label: '정산예정', variant: 'warning' },
}

export function EarningsCard({
  periodStart,
  periodEnd,
  totalAmount,
  totalHours,
  status,
}: EarningsCardProps) {
  const { label, variant } = PAYROLL_STATUS_MAP[status]

  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm text-text-secondary break-keep">
          {formatPeriod(periodStart, periodEnd)}
        </p>
        <Badge variant={variant}>{label}</Badge>
      </div>
      <p className="text-2xl font-bold text-text-primary">
        {totalAmount.toLocaleString()}원
      </p>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-text-tertiary">
        <Clock size={12} />
        <span>총 {totalHours}시간 근무</span>
        <span className="mx-1">·</span>
        <Wallet size={12} />
        <span>시급 {Math.round(totalAmount / Math.max(totalHours, 1)).toLocaleString()}원</span>
      </div>
    </Card>
  )
}
