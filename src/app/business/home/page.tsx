'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, Briefcase, ChevronRight, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'

interface UpcomingSchedule {
  id: string
  service_date: string
  start_time: string | null
  status: string
  service_type: string | null
  client: { name: string } | null
}

interface HomeData {
  businessName: string
  monthScheduleCount: number
  inProgressCount: number
  workerCount: number
  upcomingSchedules: UpcomingSchedule[]
}

const STATUS_MAP: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' | 'info' }> = {
  scheduled:   { label: '예정', variant: 'info' },
  in_progress: { label: '진행중', variant: 'primary' },
  completed:   { label: '완료', variant: 'success' },
}

function formatScheduleDate(serviceDate: string, startTime: string | null): string {
  const [, m, d] = serviceDate.split('-')
  const datePart = `${Number(m)}월 ${Number(d)}일`
  if (!startTime) return datePart
  const [h] = startTime.split(':')
  const hour = Number(h)
  const period = hour < 12 ? '오전' : '오후'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${datePart} ${period} ${displayHour}시`
}

export default function BusinessHomePage() {
  const [data, setData] = useState<HomeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/business/home')
      .then((r) => r.json())
      .then((json) => { if (json.success) setData(json.data) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const stats = data ? [
    { label: '이번 달 일정', value: `${data.monthScheduleCount}건`, icon: <Calendar size={20} />, color: 'text-brand-600' },
    { label: '등록 인력', value: `${data.workerCount}명`, icon: <Users size={20} />, color: 'text-state-success' },
    { label: '진행 중', value: `${data.inProgressCount}건`, icon: <Briefcase size={20} />, color: 'text-state-warning' },
  ] : []

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      {/* 헤더 */}
      <div>
        <p className="text-sm text-text-secondary">안녕하세요</p>
        {isLoading
          ? <div className="h-8 w-40 bg-surface-sunken rounded animate-pulse mt-1" />
          : <h1 className="text-2xl font-bold text-text-primary leading-tight">{data?.businessName ?? ''} 님 👋</h1>
        }
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padding="sm" className="text-center">
                <div className="h-12 bg-surface-sunken rounded animate-pulse" />
              </Card>
            ))
          : stats.map((stat) => (
              <Card key={stat.label} padding="sm" className="text-center">
                <span className={`${stat.color} flex justify-center mb-1`}>{stat.icon}</span>
                <p className="text-xl font-bold text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-secondary mt-0.5 break-keep">{stat.label}</p>
              </Card>
            ))
        }
      </div>

      {/* 배너 */}
      <Card className="bg-brand-600 border-0" padding="md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-brand-200">이번 달 일정 현황</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              {isLoading ? '...' : `총 ${data?.monthScheduleCount ?? 0}건`}
            </p>
          </div>
          <TrendingUp size={36} className="text-brand-300" />
        </div>
      </Card>

      {/* 예정 일정 */}
      <div className="flex flex-col gap-3">
        <SectionHeader
          title="예정 일정"
          action={
            <Button variant="ghost" size="sm" className="text-brand-600 px-0">
              전체보기 <ChevronRight size={14} />
            </Button>
          }
        />
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} padding="md">
            <div className="flex flex-col gap-2">
              <div className="h-4 w-28 bg-surface-sunken rounded animate-pulse" />
              <div className="h-3 w-40 bg-surface-sunken rounded animate-pulse" />
            </div>
          </Card>
        ))}
        {!isLoading && (data?.upcomingSchedules ?? []).length === 0 && (
          <p className="text-sm text-text-tertiary text-center py-6">예정된 일정이 없어요.</p>
        )}
        {!isLoading && (data?.upcomingSchedules ?? []).map((s) => {
          const statusInfo = STATUS_MAP[s.status] ?? { label: s.status, variant: 'info' as const }
          return (
            <Card key={s.id} onClick={() => {}} padding="md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary truncate">{s.client?.name ?? '-'}</p>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {formatScheduleDate(s.service_date, s.start_time)} · {s.service_type ?? '-'}
                  </p>
                </div>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="h-4" />
    </div>
  )
}
