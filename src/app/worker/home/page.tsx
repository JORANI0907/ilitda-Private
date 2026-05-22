'use client'

import { useState, useEffect } from 'react'
import { Calendar, Wallet, Star, ChevronRight, MapPin } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'

interface ScheduleItem {
  id: string
  hourly_rate: number | null
  schedule: {
    id: string
    service_date: string
    start_time: string | null
    status: string
    service_type: string | null
    client: { name: string; address: string | null } | null
  }
}

interface HomeData {
  name: string
  ratingAvg: number
  monthScheduleCount: number
  upcomingSchedules: ScheduleItem[]
}

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'primary' }> = {
  scheduled:   { label: '예정', variant: 'info' },
  in_progress: { label: '진행중', variant: 'primary' },
}

function formatDate(serviceDate: string): string {
  const date = new Date(serviceDate + 'T00:00:00')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const m = date.getMonth() + 1
  const d = date.getDate()
  const day = days[date.getDay()]
  return `${m}월 ${d}일(${day})`
}

function formatTime(startTime: string | null): string {
  if (!startTime) return ''
  const [h, min] = startTime.split(':')
  const hour = Number(h)
  const period = hour < 12 ? '오전' : '오후'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${period} ${displayHour}:${min}`
}

const HELP_SECTIONS = [
  {
    title: '오늘 일정 확인하기',
    content: '홈 화면 아래쪽에서 오늘 포함 가장 가까운 일정을 바로 확인할 수 있어요.\n일정 카드를 탭하면 현장 주소, 작업 내용, 출퇴근 체크 화면으로 이동합니다.',
  },
  {
    title: '출퇴근 체크 방법',
    content: '일정 카드를 탭해서 상세 화면으로 들어가세요.\n당일 일정에만 "출근" / "퇴근" 버튼이 표시됩니다.\n현장 도착 후 "출근" 버튼을, 작업 완료 후 "퇴근" 버튼을 눌러주세요.',
  },
  {
    title: 'KPI 카드 의미',
    content: '상단 카드에는 이번 달 배정된 일정 수와 예상 정산 금액이 표시됩니다.\n· 이번 달 일정: 이번 달 배정된 작업 건수\n· 이번 달 예상 정산: 실제 근무 시간 기준 예상 금액',
  },
]

export default function WorkerHomePage() {
  const [data, setData] = useState<HomeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    fetch('/api/worker/home')
      .then((r) => r.json())
      .then((json) => { if (json.success) setData(json.data) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <HelpBanner label="작업자 홈 안내" onClick={() => setHelpOpen(true)} />
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="작업자 홈 안내"
        sections={HELP_SECTIONS}
      />

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary">환영합니다</p>
          {isLoading
            ? <div className="h-8 w-32 bg-surface-sunken rounded animate-pulse mt-1" />
            : <h1 className="text-2xl font-bold text-text-primary leading-tight">{data?.name ?? ''} 님 👋</h1>
          }
        </div>
        <div className="flex items-center gap-1 bg-state-warning-bg text-state-warning rounded-full px-3 py-1.5">
          <Star size={14} fill="currentColor" />
          <span className="text-sm font-semibold">
            {isLoading ? '-' : (data?.ratingAvg ?? 0).toFixed(1)}
          </span>
        </div>
      </div>

      {/* 이번 달 요약 */}
      <div className="grid grid-cols-2 gap-3">
        <Card padding="sm" className="text-center">
          <Calendar size={20} className="text-brand-600 mx-auto mb-1" />
          {isLoading
            ? <div className="h-7 w-12 bg-surface-sunken rounded animate-pulse mx-auto" />
            : <p className="text-xl font-bold text-text-primary">{data?.monthScheduleCount ?? 0}건</p>
          }
          <p className="text-xs text-text-secondary mt-0.5">이번 달 일정</p>
        </Card>
        <Card padding="sm" className="text-center">
          <Wallet size={20} className="text-state-success mx-auto mb-1" />
          <p className="text-xl font-bold text-text-primary">-</p>
          <p className="text-xs text-text-secondary mt-0.5">이번 달 예상 정산</p>
        </Card>
      </div>

      {/* 다가오는 일정 */}
      <div className="flex flex-col gap-3">
        <SectionHeader
          title="다가오는 일정"
          action={
            <Button variant="ghost" size="sm" className="text-brand-600 px-0">
              전체보기 <ChevronRight size={14} />
            </Button>
          }
        />
        {isLoading && Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} padding="md">
            <div className="flex flex-col gap-2">
              <div className="h-4 w-28 bg-surface-sunken rounded animate-pulse" />
              <div className="h-3 w-40 bg-surface-sunken rounded animate-pulse" />
            </div>
          </Card>
        ))}
        {!isLoading && (data?.upcomingSchedules ?? []).length === 0 && (
          <p className="text-sm text-text-tertiary text-center py-6">다가오는 일정이 없어요.</p>
        )}
        {!isLoading && (data?.upcomingSchedules ?? []).map((item) => {
          const s = item.schedule
          const statusInfo = STATUS_MAP[s.status] ?? { label: s.status, variant: 'info' as const }
          return (
            <Card key={item.id} onClick={() => {}} padding="md">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary truncate">{s.client?.name ?? '-'}</p>
                  <p className="text-sm text-text-secondary mt-0.5">{s.service_type ?? '-'}</p>
                </div>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
              <div className="flex flex-col gap-1 text-xs text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  {formatDate(s.service_date)} {formatTime(s.start_time)}
                </span>
                {s.client?.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={12} />
                    {s.client.address}
                  </span>
                )}
              </div>
              {item.hourly_rate !== null && (
                <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
                  <span className="text-xs text-text-tertiary">시급</span>
                  <span className="text-sm font-bold text-brand-600">
                    {item.hourly_rate.toLocaleString()}원
                  </span>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <div className="h-4" />
    </div>
  )
}
