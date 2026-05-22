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

type Filter = 'all' | 'today' | 'week' | 'month' | 'unassigned' | 'assigned' | 'favorites'
type ScheduleWithClient = Schedule & { client?: Pick<Client, 'name' | 'is_favorite'> | null }

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'unassigned', label: '미배정' },
  { key: 'assigned', label: '배정됨' },
  { key: 'favorites', label: '즐겨찾기' },
]

interface AddScheduleForm {
  service_date: string
  start_time: string
  end_time: string
  fee: string
  notes: string
  // 고객 정보
  client_name: string
  client_phone: string
  client_address: string
  owner_name: string
  email: string
  business_number: string
  account_number: string
  // 현장 정보
  elevator: string
  parking: string
  building_access: string
  access_method: string
  care_scope: string
  business_hours_start: string
  business_hours_end: string
}

const INITIAL_FORM: AddScheduleForm = {
  service_date: '', start_time: '', end_time: '', fee: '', notes: '',
  client_name: '', client_phone: '', client_address: '',
  owner_name: '', email: '', business_number: '', account_number: '',
  elevator: '', parking: '', building_access: '',
  access_method: '', care_scope: '',
  business_hours_start: '', business_hours_end: '',
}

function ModalSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 mt-1">
      {children}
    </p>
  )
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full h-12 rounded-md bg-surface border border-border text-text-primary px-4 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
      >
        <option value="">선택 안 함</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
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

  const setF = (key: keyof AddScheduleForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  async function handleSubmit() {
    setFormError(null)
    if (!form.service_date) {
      setFormError('일정 날짜를 입력해 주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        service_date: form.service_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        fee: form.fee ? Number(form.fee) : null,
        notes: form.notes || null,
      }

      if (form.client_name.trim()) {
        payload.client_info = {
          name: form.client_name.trim(),
          phone: form.client_phone || null,
          address: form.client_address || null,
          owner_name: form.owner_name || null,
          email: form.email || null,
          business_number: form.business_number || null,
          account_number: form.account_number || null,
          elevator: form.elevator || null,
          parking: form.parking || null,
          building_access: form.building_access || null,
          access_method: form.access_method || null,
          care_scope: form.care_scope || null,
          business_hours_start: form.business_hours_start || null,
          business_hours_end: form.business_hours_end || null,
        }
      }

      const res = await fetch('/api/business/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        onClose={() => { setShowAddModal(false); setFormError(null); setForm(INITIAL_FORM) }}
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
          <ModalSectionLabel>일정 정보</ModalSectionLabel>
          <Input
            label="일정 날짜 *"
            type="date"
            value={form.service_date}
            onChange={(e) => setF('service_date')(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="시작 시간"
              type="time"
              value={form.start_time}
              onChange={(e) => setF('start_time')(e.target.value)}
            />
            <Input
              label="종료 시간"
              type="time"
              value={form.end_time}
              onChange={(e) => setF('end_time')(e.target.value)}
            />
          </div>
          <Input
            label="비용 (원)"
            type="number"
            value={form.fee}
            placeholder="예: 150000"
            onChange={(e) => setF('fee')(e.target.value)}
          />
          <Input
            label="메모"
            value={form.notes}
            placeholder="메모 (선택)"
            onChange={(e) => setF('notes')(e.target.value)}
          />

          <ModalSectionLabel>고객 정보</ModalSectionLabel>
          <Input
            label="업체명 / 이름"
            value={form.client_name}
            placeholder="예: 스타벅스 판교점"
            onChange={(e) => setF('client_name')(e.target.value)}
          />
          <Input
            label="연락처"
            type="tel"
            value={form.client_phone}
            placeholder="010-0000-0000"
            onChange={(e) => setF('client_phone')(e.target.value)}
          />
          <Input
            label="주소"
            value={form.client_address}
            placeholder="예: 성남시 분당구 판교역로..."
            onChange={(e) => setF('client_address')(e.target.value)}
          />
          <Input
            label="담당자명"
            value={form.owner_name}
            placeholder="예: 홍길동"
            onChange={(e) => setF('owner_name')(e.target.value)}
          />
          <Input
            label="이메일"
            type="email"
            value={form.email}
            placeholder="example@email.com"
            onChange={(e) => setF('email')(e.target.value)}
          />
          <Input
            label="사업자번호"
            value={form.business_number}
            placeholder="000-00-00000"
            onChange={(e) => setF('business_number')(e.target.value)}
          />
          <Input
            label="계좌번호"
            value={form.account_number}
            placeholder="예: 국민은행 123-456-789012"
            onChange={(e) => setF('account_number')(e.target.value)}
          />

          <ModalSectionLabel>현장 정보</ModalSectionLabel>
          <SelectField
            label="엘리베이터"
            value={form.elevator}
            onChange={setF('elevator')}
            options={['있음', '없음', '계단 전용']}
          />
          <SelectField
            label="주차"
            value={form.parking}
            onChange={setF('parking')}
            options={['가능', '불가', '유료 주차']}
          />
          <SelectField
            label="건물출입신청여부"
            value={form.building_access}
            onChange={setF('building_access')}
            options={['자유출입', '사전출입신청']}
          />
          <Input
            label="출입 방법 상세"
            value={form.access_method}
            placeholder="예: 비밀번호 1234"
            onChange={(e) => setF('access_method')(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">서비스 내용</label>
            <textarea
              value={form.care_scope}
              rows={3}
              placeholder="예: 주방 후드, 환풍구, 에어컨 실내기 3대"
              onChange={(e) => setF('care_scope')(e.target.value)}
              className="block w-full rounded-md bg-surface border border-border text-text-primary placeholder:text-text-tertiary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">영업 시간</label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={form.business_hours_start}
                onChange={(e) => setF('business_hours_start')(e.target.value)}
                className="flex-1 h-12 rounded-md bg-surface border border-border text-text-primary px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
              <span className="text-text-tertiary text-sm">~</span>
              <input
                type="time"
                value={form.business_hours_end}
                onChange={(e) => setF('business_hours_end')(e.target.value)}
                className="flex-1 h-12 rounded-md bg-surface border border-border text-text-primary px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
          </div>

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
