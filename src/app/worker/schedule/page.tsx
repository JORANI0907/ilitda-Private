'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScheduleItem } from '@/components/worker/ScheduleItem'
import type { ScheduleItemData } from '@/components/worker/ScheduleItem'

type FilterKey = 'all' | 'this_week' | 'next_week'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'this_week', label: '이번 주' },
  { key: 'next_week', label: '다음 주' },
  { key: 'all',       label: '전체' },
]

export default function WorkerSchedulePage() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>('this_week')
  const [schedules, setSchedules] = useState<ScheduleItemData[]>([])
  const [today, setToday] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSchedules = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/worker/schedules?filter=${filter}`)
        const json = await res.json()
        if (json.success) {
          setSchedules(json.data ?? [])
          setToday(json.meta?.today ?? '')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchSchedules()
  }, [filter])

  const isToday = (dateStr: string | undefined): boolean => {
    if (!dateStr || !today) return false
    return dateStr === today
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <SectionHeader title="내 일정" level="page" />

      {/* 필터 탭 */}
      <div className="flex gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`
              flex-1 h-9 rounded-lg text-sm font-medium transition-colors
              ${filter === key
                ? 'bg-brand-600 text-white'
                : 'bg-surface border border-border-subtle text-text-secondary hover:text-text-primary'}
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 일정 목록 */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-surface-sunken animate-pulse"
              />
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <EmptyState
            icon={<Calendar size={36} />}
            title="일정이 없습니다"
            description="해당 기간에 배정된 일정이 없어요."
            bordered
          />
        ) : (
          schedules.map((item) => (
            <ScheduleItem
              key={item.id}
              item={item}
              isToday={isToday(item.schedule?.service_date)}
              onClick={() => router.push(`/worker/schedule/${item.id}`)}
            />
          ))
        )}
      </div>

      <div className="h-4" />
    </div>
  )
}
