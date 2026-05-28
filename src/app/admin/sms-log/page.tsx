'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'

interface SmsUsageItem {
  id: string
  business_name: string
  plan_type: string
  monthly_sms_count: number
  monthly_sms_reset_date: string | null
}

const SMS_LIMITS: Record<string, number | null> = {
  free: 150,
  basic: 600,
  pro: null,
  max: null,
}

const PLAN_BADGE: Record<string, { label: string; className: string }> = {
  free:  { label: 'Free',  className: 'bg-surface-sunken text-text-secondary border border-border' },
  basic: { label: 'Basic', className: 'bg-blue-100 text-blue-700' },
  pro:   { label: 'Pro',   className: 'bg-violet-100 text-violet-700' },
  max:   { label: 'Max',   className: 'bg-orange-100 text-orange-700' },
}

function PlanBadge({ plan }: { plan: string }) {
  const badge = PLAN_BADGE[plan] ?? PLAN_BADGE.free
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
      {badge.label}
    </span>
  )
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10).replace(/-/g, '.')
}

function SmsCard({ item }: { item: SmsUsageItem }) {
  const limit = SMS_LIMITS[item.plan_type] ?? null
  const isUnlimited = limit === null
  const used = item.monthly_sms_count
  const pct = isUnlimited ? 100 : limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0

  return (
    <Card padding="md">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-text-primary truncate">{item.business_name}</p>
          <PlanBadge plan={item.plan_type} />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">
              이번 달 발송: <span className="font-semibold text-text-primary">{used}건</span>
              {' / '}
              한도: <span className="font-semibold text-text-primary">
                {isUnlimited ? '무제한' : `${limit}건`}
              </span>
            </span>
            {!isUnlimited && (
              <span className="text-xs text-text-tertiary">{pct}%</span>
            )}
          </div>

          <div className="h-2 bg-surface-sunken rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isUnlimited ? 'bg-blue-400' : pct >= 100 ? 'bg-state-danger' : pct >= 80 ? 'bg-state-warning' : 'bg-brand-600'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-text-tertiary">
          마지막 초기화: {formatDate(item.monthly_sms_reset_date)}
        </p>
      </div>
    </Card>
  )
}

export default function AdminSmsLogPage() {
  const [items, setItems] = useState<SmsUsageItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/admin/stats')
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '불러오기 실패')
        return
      }
      setItems(json.data.smsUsage ?? [])
    } catch {
      setError('네트워크 오류')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-24">
      <SectionHeader
        title="SMS 사용 현황"
        description={`총 ${items.length}개 계정`}
        level="page"
      />

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} padding="md">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-5 w-36 bg-surface-sunken rounded animate-pulse" />
                  <div className="h-5 w-12 bg-surface-sunken rounded-full animate-pulse" />
                </div>
                <div className="h-4 w-full bg-surface-sunken rounded animate-pulse" />
                <div className="h-2 w-full bg-surface-sunken rounded-full animate-pulse" />
                <div className="h-3 w-24 bg-surface-sunken rounded animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-state-danger">{error}</p>
          <Button variant="secondary" size="sm" onClick={load}>
            재시도
          </Button>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          icon={<MessageSquare size={40} />}
          title="등록된 계정이 없습니다"
          description="SMS 사용 현황을 확인할 계정이 없습니다."
          bordered
        />
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map(item => (
            <SmsCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
