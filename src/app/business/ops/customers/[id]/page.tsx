'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Phone, MapPin, Tag, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScheduleStatusBadge } from '@/components/ui/Badge'

interface ScheduleHistory {
  id: string
  service_date: string
  start_time: string
  status: string
  fee: number | null
  notes: string | null
}

interface CustomerDetail {
  id: string
  name: string
  phone: string | null
  address: string | null
  type: string | null
  notes: string | null
  schedules: ScheduleHistory[]
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomer = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/business/customers/${id}`)
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '불러오기에 실패했습니다.')
        return
      }
      setCustomer(json.data)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCustomer()
  }, [fetchCustomer])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6">
        <div className="h-6 w-32 bg-surface-sunken rounded animate-pulse" />
        <div className="h-40 bg-surface-sunken rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 pt-20">
        <p className="text-sm text-state-danger">{error ?? '고객을 찾을 수 없습니다.'}</p>
        <Button variant="secondary" size="sm" onClick={fetchCustomer}>재시도</Button>
      </div>
    )
  }

  const sortedSchedules = [...customer.schedules].sort(
    (a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
  )

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-text-primary leading-tight">고객 상세</h1>
      </div>

      {/* 고객 정보 */}
      <Card padding="md">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-text-primary">{customer.name}</h2>
          <div className="flex flex-col gap-1.5 text-sm text-text-secondary">
            {customer.phone && (
              <p className="flex items-center gap-2">
                <Phone size={14} className="text-text-tertiary shrink-0" />
                {customer.phone}
              </p>
            )}
            {customer.address && (
              <p className="flex items-center gap-2">
                <MapPin size={14} className="text-text-tertiary shrink-0" />
                {customer.address}
              </p>
            )}
            {customer.type && (
              <p className="flex items-center gap-2">
                <Tag size={14} className="text-text-tertiary shrink-0" />
                {customer.type}
              </p>
            )}
          </div>
          {customer.notes && (
            <p className="text-sm text-text-secondary bg-surface-sunken rounded-xl px-3 py-2">
              {customer.notes}
            </p>
          )}
        </div>
      </Card>

      {/* 일정 히스토리 */}
      <div className="flex flex-col gap-3">
        <SectionHeader title="방문 이력" />

        {sortedSchedules.length === 0 && (
          <EmptyState
            icon={<CalendarDays size={32} />}
            title="방문 이력이 없어요"
            bordered
            size="sm"
          />
        )}

        {sortedSchedules.map((s) => {
          const dateStr = new Date(s.service_date).toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric',
          })
          return (
            <Card
              key={s.id}
              padding="md"
              onClick={() => router.push(`/business/ops/schedules/${s.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{dateStr}</p>
                  {s.start_time && (
                    <p className="text-xs text-text-secondary">{s.start_time.slice(0, 5)}</p>
                  )}
                  {s.fee && (
                    <p className="text-xs text-text-tertiary">{s.fee.toLocaleString('ko-KR')}원</p>
                  )}
                </div>
                <ScheduleStatusBadge status={s.status} />
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
