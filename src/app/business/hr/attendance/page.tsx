'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { createClient } from '@/lib/supabase/client'

interface AttendanceRow {
  id: string
  checkin_at: string | null
  checkout_at: string | null
  total_minutes: number | null
  assignment: {
    id: string
    schedule: {
      service_date: string
      business_id: string
    } | null
    worker: {
      id: string
      profile: { name: string } | null
    } | null
  } | null
}

export default function AttendancePage() {
  const today = new Date().toISOString().slice(0, 10)
  const [dateFilter, setDateFilter] = useState(today)
  const [records, setRecords] = useState<AttendanceRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setRecords([])
        setIsLoading(false)
        return
      }

      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (bizError || !business) {
        setError('사업자 정보를 찾을 수 없습니다.')
        setIsLoading(false)
        return
      }

      const { data, error: attError } = await supabase
        .from('attendances')
        .select(`
          id, checkin_at, checkout_at, total_minutes,
          assignment:assignments(
            id,
            schedule:schedules!inner(service_date, business_id),
            worker:workers(
              id,
              profile:profiles(name)
            )
          )
        `)
        .eq('assignment.schedule.business_id', business.id)
        .eq('assignment.schedule.service_date', dateFilter)
        .order('checkin_at', { ascending: true })

      if (attError) {
        setError(attError.message)
        return
      }

      setRecords((data ?? []) as unknown as AttendanceRow[])
    } catch {
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [dateFilter])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  function formatTime(iso: string | null) {
    if (!iso) return '-'
    return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <SectionHeader title="출퇴근 기록" level="page" />

      {/* 날짜 필터 */}
      <Input
        label="날짜"
        type="date"
        value={dateFilter}
        onChange={(e) => setDateFilter(e.target.value)}
      />

      <div className="flex flex-col gap-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} padding="md">
            <div className="flex flex-col gap-2">
              <div className="h-4 w-24 bg-surface-sunken rounded animate-pulse" />
              <div className="h-3 w-40 bg-surface-sunken rounded animate-pulse" />
            </div>
          </Card>
        ))}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-state-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchAttendance}>재시도</Button>
          </div>
        )}

        {!isLoading && !error && records.length === 0 && (
          <EmptyState
            icon={<CalendarDays size={40} />}
            title="출퇴근 기록이 없어요"
            description={`${dateFilter} 날짜의 기록이 없습니다.`}
            bordered
          />
        )}

        {!isLoading && !error && records.map((r) => {
          const name = r.assignment?.worker?.profile?.name ?? '이름 없음'
          const workedMin = r.total_minutes ?? 0
          const workedHours = (workedMin / 60).toFixed(1)

          return (
            <Card key={r.id} padding="md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="font-semibold text-text-primary">{name}</span>
                  <div className="flex gap-4 text-sm text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-state-success shrink-0" />
                      출근 {formatTime(r.checkin_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-state-danger shrink-0" />
                      퇴근 {formatTime(r.checkout_at)}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-text-primary">{workedHours}시간</p>
                  <p className="text-xs text-text-tertiary">{workedMin}분</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
