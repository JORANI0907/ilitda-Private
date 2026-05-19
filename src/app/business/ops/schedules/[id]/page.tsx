'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Calendar, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { AssignmentStatusBadge, ScheduleStatusBadge } from '@/components/ui/Badge'

interface AttendanceData {
  id: string
  checkin_at: string | null
  checkout_at: string | null
  total_minutes: number | null
}

interface AssignmentData {
  id: string
  status: string
  hourly_rate: number | null
  created_at: string
  worker: {
    id: string
    profile: { name: string; phone: string } | null
  } | null
  attendances: AttendanceData[]
}

interface ScheduleDetail {
  id: string
  service_date: string
  start_time: string
  end_time: string | null
  status: string
  fee: number | null
  notes: string | null
  client: { id: string; name: string; phone: string | null; address: string | null } | null
  assignments: AssignmentData[]
}

interface WorkerOption {
  worker_id: string
  last_worked: string
  worker: {
    id: string
    profile: { name: string; phone: string } | null
  } | null
}

export default function ScheduleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [workers, setWorkers] = useState<WorkerOption[]>([])
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  const fetchSchedule = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/business/schedules/${id}`)
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '불러오기에 실패했습니다.')
        return
      }
      setSchedule(json.data)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  async function handleOpenAssignModal() {
    setShowAssignModal(true)
    try {
      const res = await fetch('/api/business/workers')
      const json = await res.json()
      if (json.success) setWorkers(json.data ?? [])
    } catch {
      // 조용히 실패
    }
  }

  async function handleAssign() {
    setAssignError(null)
    if (!selectedWorkerId) {
      setAssignError('작업자를 선택해 주세요.')
      return
    }
    setIsAssigning(true)
    try {
      const res = await fetch('/api/business/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: id,
          worker_id: selectedWorkerId,
          hourly_rate: hourlyRate ? Number(hourlyRate) : null,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setAssignError(json.error ?? '배정에 실패했습니다.')
        return
      }
      setShowAssignModal(false)
      setSelectedWorkerId('')
      setHourlyRate('')
      await fetchSchedule()
    } catch {
      setAssignError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsAssigning(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6">
        <div className="h-6 w-32 bg-surface-sunken rounded animate-pulse" />
        <div className="h-32 bg-surface-sunken rounded-2xl animate-pulse" />
        <div className="h-24 bg-surface-sunken rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (error || !schedule) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 pt-20">
        <p className="text-sm text-state-danger">{error ?? '일정을 찾을 수 없습니다.'}</p>
        <Button variant="secondary" size="sm" onClick={fetchSchedule}>재시도</Button>
      </div>
    )
  }

  const dateStr = new Date(schedule.service_date).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

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
        <h1 className="text-xl font-bold text-text-primary leading-tight">일정 상세</h1>
      </div>

      {/* 일정 정보 */}
      <Card padding="md">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary text-lg">
              {schedule.client?.name ?? '고객 미지정'}
            </h2>
            <ScheduleStatusBadge status={schedule.status} />
          </div>
          <div className="flex flex-col gap-1.5 text-sm text-text-secondary">
            <p className="flex items-center gap-2">
              <Calendar size={14} className="text-text-tertiary shrink-0" />
              {dateStr}
            </p>
            {schedule.start_time && (
              <p className="flex items-center gap-2">
                <Clock size={14} className="text-text-tertiary shrink-0" />
                {schedule.start_time.slice(0, 5)}
                {schedule.end_time && ` ~ ${schedule.end_time.slice(0, 5)}`}
              </p>
            )}
            {schedule.client?.address && (
              <p className="flex items-center gap-2">
                <MapPin size={14} className="text-text-tertiary shrink-0" />
                {schedule.client.address}
              </p>
            )}
          </div>
          {schedule.fee && (
            <p className="text-base font-bold text-text-primary">
              {schedule.fee.toLocaleString('ko-KR')}원
            </p>
          )}
          {schedule.notes && (
            <p className="text-sm text-text-secondary bg-surface-sunken rounded-xl px-3 py-2">
              {schedule.notes}
            </p>
          )}
        </div>
      </Card>

      {/* 배정 목록 */}
      <div className="flex flex-col gap-3">
        <SectionHeader
          title="배정 인력"
          action={
            <Button size="sm" variant="secondary" onClick={handleOpenAssignModal}>
              <UserPlus size={14} />
              작업자 추가
            </Button>
          }
        />

        {schedule.assignments.length === 0 && (
          <EmptyState
            icon={<UserPlus size={32} />}
            title="배정된 작업자가 없어요"
            description="작업자 추가 버튼을 눌러 배정하세요."
            bordered
            size="sm"
          />
        )}

        {schedule.assignments.map((a) => {
          const att = a.attendances[0]
          return (
            <Card key={a.id} padding="md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="font-medium text-text-primary">
                    {a.worker?.profile?.name ?? '이름 없음'}
                  </span>
                  {a.worker?.profile?.phone && (
                    <span className="text-sm text-text-secondary">{a.worker.profile.phone}</span>
                  )}
                  {a.hourly_rate && (
                    <span className="text-xs text-text-tertiary">
                      시급 {a.hourly_rate.toLocaleString('ko-KR')}원
                    </span>
                  )}
                  {att && (
                    <div className="mt-1 text-xs text-text-secondary space-y-0.5">
                      {att.checkin_at && (
                        <p>출근: {new Date(att.checkin_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                      )}
                      {att.checkout_at && (
                        <p>퇴근: {new Date(att.checkout_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                      )}
                      {att.total_minutes && (
                        <p>총 {(att.total_minutes / 60).toFixed(1)}시간</p>
                      )}
                    </div>
                  )}
                </div>
                <AssignmentStatusBadge status={a.status} />
              </div>
            </Card>
          )
        })}
      </div>

      {/* 작업자 배정 모달 */}
      <Modal
        open={showAssignModal}
        onClose={() => { setShowAssignModal(false); setAssignError(null) }}
        title="작업자 배정"
        footer={
          <>
            <Button fullWidth onClick={handleAssign} isLoading={isAssigning}>
              배정하기
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setShowAssignModal(false)}>
              취소
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              작업자 선택
            </label>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="block w-full h-12 rounded-md bg-surface border border-border text-text-primary px-4 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            >
              <option value="">작업자를 선택하세요</option>
              {workers.map((w) => (
                <option key={w.worker_id} value={w.worker_id}>
                  {w.worker?.profile?.name ?? '이름 없음'}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="시급 (원, 선택)"
            type="number"
            value={hourlyRate}
            placeholder="예: 15000"
            onChange={(e) => setHourlyRate(e.target.value)}
          />
          {assignError && (
            <p className="text-sm text-state-danger">{assignError}</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
