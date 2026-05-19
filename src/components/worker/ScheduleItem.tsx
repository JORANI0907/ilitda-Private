'use client'

import { Calendar, MapPin, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { AssignmentStatusBadge } from '@/components/ui/Badge'

export interface ScheduleItemData {
  id: string
  status: string
  hourly_rate: number | null
  schedule: {
    id: string
    service_date: string
    start_time: string
    end_time: string | null
    client: {
      name: string
      address: string | null
    } | null
  } | null
}

interface ScheduleItemProps {
  item: ScheduleItemData
  isToday?: boolean
  onClick?: () => void
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const weekday = weekdays[d.getDay()]
  return `${month}월 ${day}일(${weekday})`
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const minute = m ?? '00'
  const ampm = hour < 12 ? '오전' : '오후'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${ampm} ${displayHour}:${minute}`
}

export function ScheduleItem({ item, isToday = false, onClick }: ScheduleItemProps) {
  const schedule = item.schedule

  return (
    <Card onClick={onClick} padding="md" className={isToday ? 'ring-1 ring-brand-600/30' : ''}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-text-primary truncate">
            {schedule?.client?.name ?? '고객 정보 없음'}
          </p>
          {isToday && (
            <span className="inline-block mt-0.5 text-xs text-brand-600 font-medium">오늘</span>
          )}
        </div>
        <AssignmentStatusBadge status={item.status} />
      </div>

      <div className="flex flex-col gap-1 text-xs text-text-secondary">
        {schedule?.service_date && (
          <span className="flex items-center gap-1.5">
            <Calendar size={12} className="shrink-0" />
            {formatDate(schedule.service_date)}
            {schedule.start_time && ` · ${formatTime(schedule.start_time)}`}
            {schedule.end_time && ` ~ ${formatTime(schedule.end_time)}`}
          </span>
        )}
        {schedule?.client?.address && (
          <span className="flex items-center gap-1.5 truncate">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{schedule.client.address}</span>
          </span>
        )}
      </div>

      {item.hourly_rate && (
        <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-text-tertiary">
            <Wallet size={12} />
            시급
          </span>
          <span className="text-sm font-bold text-brand-600">
            {item.hourly_rate.toLocaleString()}원
          </span>
        </div>
      )}
    </Card>
  )
}
