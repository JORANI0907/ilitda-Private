'use client'

import { CheckCircle, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Payroll, Profile, Worker } from '@/types'

interface PayrollCardProps {
  payroll: Payroll & {
    worker?: (Worker & {
      profile?: Pick<Profile, 'name' | 'phone'> | null
    }) | null
  }
  onMarkPaid?: (id: string) => void
  isPaying?: boolean
}

export function PayrollCard({ payroll, onMarkPaid, isPaying }: PayrollCardProps) {
  const name = payroll.worker?.profile?.name ?? '작업자 미지정'
  const isPaid = payroll.status === 'paid'
  const amountStr = payroll.total_amount.toLocaleString('ko-KR')
  const hoursStr = (payroll.total_hours / 60).toFixed(1)

  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary">{name}</span>
            <Badge variant={isPaid ? 'success' : 'warning'}>
              {isPaid ? '지급완료' : '미지급'}
            </Badge>
          </div>
          <p className="text-sm text-text-secondary flex items-center gap-1.5">
            <Clock size={13} className="shrink-0 text-text-tertiary" />
            {hoursStr}시간 작업
          </p>
          <p className="text-lg font-bold text-text-primary">
            {amountStr}원
          </p>
          {isPaid && payroll.paid_at && (
            <p className="text-xs text-text-tertiary">
              지급일: {new Date(payroll.paid_at).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>
        {!isPaid && onMarkPaid && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onMarkPaid(payroll.id)}
            isLoading={isPaying}
            className="shrink-0"
          >
            <CheckCircle size={14} />
            송금완료
          </Button>
        )}
      </div>
    </Card>
  )
}

export function PayrollCardSkeleton() {
  return (
    <Card padding="md">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 bg-surface-sunken rounded animate-pulse" />
        <div className="h-3 w-24 bg-surface-sunken rounded animate-pulse" />
        <div className="h-6 w-28 bg-surface-sunken rounded animate-pulse" />
      </div>
    </Card>
  )
}
