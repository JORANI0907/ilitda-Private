'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { LoginPrompt } from '@/components/shared/LoginPrompt'
import { ScheduleCard, ScheduleCardSkeleton } from '@/components/business/ScheduleCard'
import { useRouter } from 'next/navigation'
import type { Schedule, Client } from '@/types'

type Filter = 'all' | 'today' | 'week' | 'month'
type ScheduleWithClient = Schedule & { client?: Pick<Client, 'name'> | null }

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'today', label: '오늘' },
  { key: 'week', label: '이번주' },
  { key: 'month', label: '이번달' },
]

interface AddScheduleForm {
  service_date: string
  start_time: string
  notes: string
}

const INITIAL_FORM: AddScheduleForm = {
  service_date: '',
  start_time: '',
  notes: '',
}

export default function SchedulesPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [schedules, setSchedules] = useState<ScheduleWithClient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [form, setForm] = useState<AddScheduleForm>(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/business/schedules?filter=${filter}`)
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '불러오기에 실패했습니다.')
        return
      }
      setSchedules(json.data ?? [])
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  function handleAddClick() {
    if (!isLoggedIn) {
      setShowLoginPrompt(true)
      return
    }
    setShowAddModal(true)
  }

  async function handleSubmit() {
    setFormError(null)
    if (!form.service_date) {
      setFormError('일정 날짜를 입력해 주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/business/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) {
        if (res.status === 401) {
          setIsLoggedIn(false)
          setShowAddModal(false)
          setShowLoginPrompt(true)
          return
        }
        setFormError(json.error ?? '저장에 실패했습니다.')
        return
      }
      setShowAddModal(false)
      setForm(INITIAL_FORM)
      await fetchSchedules()
    } catch {
      setFormError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <SectionHeader
        title="일정"
        level="page"
        action={
          <Button size="sm" onClick={handleAddClick}>
            <Plus size={16} />
            추가
          </Button>
        }
      />

      {/* 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`
              shrink-0 h-8 px-4 rounded-full text-sm font-medium transition-colors
              ${filter === f.key
                ? 'bg-brand-600 text-white'
                : 'bg-surface-sunken text-text-secondary hover:bg-border'}
            `}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div className="flex flex-col gap-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <ScheduleCardSkeleton key={i} />
        ))}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-state-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchSchedules}>
              재시도
            </Button>
          </div>
        )}

        {!isLoading && !error && schedules.length === 0 && (
          <EmptyState
            icon={<CalendarDays size={40} />}
            title="일정이 없어요"
            description="+ 버튼을 눌러 새 일정을 추가해 보세요."
            bordered
          />
        )}

        {!isLoading && !error && schedules.map((s) => (
          <ScheduleCard
            key={s.id}
            schedule={s}
            onClick={() => router.push(`/business/ops/schedules/${s.id}`)}
          />
        ))}
      </div>

      {/* 일정 추가 모달 */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setFormError(null) }}
        title="일정 추가"
        footer={
          <>
            <Button fullWidth onClick={handleSubmit} isLoading={isSubmitting}>
              저장하기
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setShowAddModal(false)}>
              취소
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="일정 날짜"
            type="date"
            value={form.service_date}
            onChange={(e) => setForm({ ...form, service_date: e.target.value })}
          />
          <Input
            label="시작 시간"
            type="time"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          />
          <Input
            label="메모"
            value={form.notes}
            placeholder="메모 (선택)"
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          {formError && (
            <p className="text-sm text-state-danger">{formError}</p>
          )}
        </div>
      </Modal>

      {/* 로그인 유도 */}
      <LoginPrompt
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="일정을 추가하려면 로그인이 필요합니다."
      />
    </div>
  )
}
