'use client'

import { Calendar, Clock, User } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ScheduleStatusBadge } from '@/components/ui/Badge'
import type { Schedule, Client } from '@/types'

interface ScheduleCardProps {
  schedule: Schedule & { client?: Pick<Client, 'name'> | null }
  onClick?: () => void
}

export function ScheduleCard({ schedule, onClick }: ScheduleCardProps) {
  const dateStr = new Date(schedule.service_date).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  const timeStr = schedule.start_time
    ? schedule.start_time.slice(0, 5)
    : '시간 미정'

  return (
    <Card onClick={onClick} padding="md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <User size={14} className="shrink-0 text-text-tertiary" />
            <span className="font-semibold text-text-primary truncate">
              {schedule.client?.name ?? '고객 미지정'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <span className="flex items-center gap-1">
              <Calendar size={13} className="shrink-0" />
              {dateStr}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={13} className="shrink-0" />
              {timeStr}
            </span>
          </div>
          {schedule.notes && (
            <p className="text-xs text-text-tertiary truncate">{schedule.notes}</p>
          )}
        </div>
        <ScheduleStatusBadge status={schedule.status} />
      </div>
    </Card>
  )
}

// 스켈레톤
export function ScheduleCardSkeleton() {
  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-4 w-32 bg-surface-sunken rounded animate-pulse" />
          <div className="h-3 w-48 bg-surface-sunken rounded animate-pulse" />
        </div>
        <div className="h-5 w-12 bg-surface-sunken rounded-full animate-pulse" />
      </div>
    </Card>
  )
}
