'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Users, Package, LogIn } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SectionHeader } from '@/components/ui/SectionHeader'

interface DaySchedule {
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
  monthWorkerCount: number
  lowStockCount: number
  isDemo?: boolean
  todaySchedules: DaySchedule[]
  tomorrowSchedules: DaySchedule[]
}

const STATUS_MAP: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' | 'info' }> = {
  scheduled:   { label: '예정',   variant: 'info' },
  in_progress: { label: '진행중', variant: 'primary' },
  completed:   { label: '완료',   variant: 'success' },
}

function formatTime(startTime: string | null): string {
  if (!startTime) return ''
  const [h] = startTime.split(':')
  const hour = Number(h)
  const period = hour < 12 ? '오전' : '오후'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${period} ${displayHour}시`
}

type DayFilter = 'today' | 'tomorrow'

export default function BusinessHomePage() {
  const router = useRouter()
  const [data, setData] = useState<HomeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dayFilter, setDayFilter] = useState<DayFilter>('today')

  useEffect(() => {
    fetch('/api/business/home')
      .then((r) => r.json())
      .then((json) => { if (json.success) setData(json.data) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const stats = data ? [
    {
      label: '이번달 일정',
      value: `${data.monthScheduleCount}건`,
      icon: <Calendar size={20} />,
      color: 'text-brand-600',
      href: '/business/ops/schedules',
    },
    {
      label: '이번달 작업자',
      value: `${data.monthWorkerCount}건`,
      icon: <Users size={20} />,
      color: 'text-state-success',
      href: '/business/ops/schedules',
    },
    {
      label: '재고 부족',
      value: `${data.lowStockCount}건`,
      icon: <Package size={20} />,
      color: data.lowStockCount > 0 ? 'text-state-danger' : 'text-text-tertiary',
      href: '/business/ops/inventory',
    },
  ] : []

  const schedules = dayFilter === 'today'
    ? (data?.todaySchedules ?? [])
    : (data?.tomorrowSchedules ?? [])

  const dayLabel = dayFilter === 'today' ? '오늘' : '내일'

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      {/* 데모 배너 */}
      {data?.isDemo && (
        <div className="flex items-center justify-between gap-3 bg-brand-50 border border-brand-200 rounded-2xl px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-700">데모 모드로 둘러보는 중이에요</p>
            <p className="text-xs text-brand-600 mt-0.5 break-keep">가입하면 나만의 사업장을 관리할 수 있어요.</p>
          </div>
          <Link
            href="/login/register"
            className="flex-shrink-0 flex items-center gap-1.5 bg-brand-600 text-white text-xs font-semibold px-3 h-9 rounded-lg hover:bg-brand-700 transition-colors"
          >
            <LogIn size={14} />
            가입하기
          </Link>
        </div>
      )}

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
              <Card
                key={stat.label}
                padding="sm"
                className="text-center cursor-pointer hover:border-brand-200 hover:bg-brand-50/30 hover:shadow-card active:scale-[0.98] transition-all"
                onClick={() => router.push(stat.href)}
              >
                <span className={`${stat.color} flex justify-center mb-1`}>{stat.icon}</span>
                <p className="text-xl font-bold text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-secondary mt-0.5 break-keep">{stat.label}</p>
              </Card>
            ))
        }
      </div>

      {/* 오늘/내일 일정 */}
      <div className="flex flex-col gap-3">
        <SectionHeader
          title="일정"
          action={
            <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5">
              {(['today', 'tomorrow'] as const).map((day) => (
                <button
                  key={day}
                  onClick={() => setDayFilter(day)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    dayFilter === day
                      ? 'bg-white text-text-primary shadow-soft'
                      : 'text-text-tertiary hover:text-text-secondary hover:bg-border'
                  }`}
                >
                  {day === 'today' ? '오늘' : '내일'}
                </button>
              ))}
            </div>
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

        {!isLoading && schedules.length === 0 && (
          <p className="text-sm text-text-tertiary text-center py-6">{dayLabel} 일정이 없어요.</p>
        )}

        {!isLoading && schedules.map((s) => {
          const statusInfo = STATUS_MAP[s.status] ?? { label: s.status, variant: 'info' as const }
          const timeStr = formatTime(s.start_time)
          return (
            <Card
              key={s.id}
              padding="md"
              className="cursor-pointer hover:border-brand-200 hover:bg-brand-50/30 hover:shadow-card active:scale-[0.98] transition-all"
              onClick={() => router.push('/business/applications')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary truncate">{s.client?.name ?? '-'}</p>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {[timeStr, s.service_type].filter(Boolean).join(' · ')}
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
