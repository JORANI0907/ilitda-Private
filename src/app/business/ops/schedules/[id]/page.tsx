'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Phone, MapPin, Check, UserCheck, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ScheduleStatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

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
  attended_at: string | null
  created_at: string
  connection: { id: string; display_name: string; manual_phone: string | null } | null
  worker: { id: string; profile: { name: string; phone: string } | null } | null
  attendance: AttendanceData[]
}

interface ScheduleDetail {
  id: string
  service_date: string
  start_time: string
  end_time: string | null
  status: string
  fee: number | null
  notes: string | null
  client: {
    id: string
    name: string
    phone: string | null
    address: string | null
    owner_name: string | null
    email: string | null
    business_number: string | null
    account_number: string | null
    elevator: string | null
    parking: string | null
    building_access: string | null
    access_method: string | null
    care_scope: string | null
    business_hours_start: string | null
    business_hours_end: string | null
  } | null
  assignments: AssignmentData[]
}

interface ConnectionOption {
  id: string
  display_name: string
  manual_phone: string | null
  status: string
}

interface ScheduleEditForm {
  service_date: string
  start_time: string
  end_time: string
  fee: string
  notes: string
  client_name: string
  client_phone: string
  client_address: string
  owner_name: string
  email: string
  business_number: string
  account_number: string
  elevator: string
  parking: string
  building_access: string
  access_method: string
  care_scope: string
  business_hours_start: string
  business_hours_end: string
}

const EMPTY_EDIT_FORM: ScheduleEditForm = {
  service_date: '', start_time: '', end_time: '', fee: '', notes: '',
  client_name: '', client_phone: '', client_address: '',
  owner_name: '', email: '', business_number: '', account_number: '',
  elevator: '', parking: '', building_access: '',
  access_method: '', care_scope: '',
  business_hours_start: '', business_hours_end: '',
}

function getAssignmentName(a: AssignmentData): string {
  return a.connection?.display_name ?? a.worker?.profile?.name ?? '이름 없음'
}

function getAssignmentPhone(a: AssignmentData): string | null {
  return a.connection?.manual_phone ?? a.worker?.profile?.phone ?? null
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start gap-2 py-1.5 border-b border-border-subtle last:border-0">
    <span className="text-xs text-text-secondary shrink-0 w-20">{label}</span>
    <span className="text-xs text-text-primary flex-1 text-right">{value ?? '-'}</span>
  </div>
)

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
  label: string; value: string; onChange: (v: string) => void; options: string[]
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

export default function ScheduleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [connections, setConnections] = useState<ConnectionOption[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  const [attendingId, setAttendingId] = useState<string | null>(null)

  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<ScheduleEditForm>(EMPTY_EDIT_FORM)
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const fetchSchedule = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/business/schedules/${id}`)
      const json = await res.json()
      if (!json.success) { setError(json.error ?? '불러오기에 실패했습니다.'); return }
      setSchedule(json.data)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => { fetchSchedule() }, [fetchSchedule])

  function handleOpenEditModal() {
    if (!schedule) return
    const c = schedule.client
    setEditForm({
      service_date: schedule.service_date ?? '',
      start_time: schedule.start_time?.slice(0, 5) ?? '',
      end_time: schedule.end_time?.slice(0, 5) ?? '',
      fee: schedule.fee != null ? String(schedule.fee) : '',
      notes: schedule.notes ?? '',
      client_name: c?.name ?? '',
      client_phone: c?.phone ?? '',
      client_address: c?.address ?? '',
      owner_name: c?.owner_name ?? '',
      email: c?.email ?? '',
      business_number: c?.business_number ?? '',
      account_number: c?.account_number ?? '',
      elevator: c?.elevator ?? '',
      parking: c?.parking ?? '',
      building_access: c?.building_access ?? '',
      access_method: c?.access_method ?? '',
      care_scope: c?.care_scope ?? '',
      business_hours_start: c?.business_hours_start ?? '',
      business_hours_end: c?.business_hours_end ?? '',
    })
    setEditError(null)
    setShowEditModal(true)
  }

  async function handleEditSubmit() {
    setEditError(null)
    if (!editForm.service_date) { setEditError('일정 날짜를 입력해 주세요.'); return }
    setIsEditing(true)
    try {
      const payload: Record<string, unknown> = {
        service_date: editForm.service_date,
        start_time: editForm.start_time || null,
        end_time: editForm.end_time || null,
        fee: editForm.fee ? Number(editForm.fee) : null,
        notes: editForm.notes || null,
        client_info: {
          name: editForm.client_name || null,
          phone: editForm.client_phone || null,
          address: editForm.client_address || null,
          owner_name: editForm.owner_name || null,
          email: editForm.email || null,
          business_number: editForm.business_number || null,
          account_number: editForm.account_number || null,
          elevator: editForm.elevator || null,
          parking: editForm.parking || null,
          building_access: editForm.building_access || null,
          access_method: editForm.access_method || null,
          care_scope: editForm.care_scope || null,
          business_hours_start: editForm.business_hours_start || null,
          business_hours_end: editForm.business_hours_end || null,
        },
      }

      const res = await fetch(`/api/business/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) { setEditError(json.error ?? '저장에 실패했습니다.'); return }
      setShowEditModal(false)
      await fetchSchedule()
    } catch {
      setEditError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsEditing(false)
    }
  }

  const setEF = (key: keyof ScheduleEditForm) => (value: string) =>
    setEditForm((prev) => ({ ...prev, [key]: value }))

  async function handleOpenAssignModal() {
    setShowAssignModal(true)
    try {
      const res = await fetch('/api/business/hr/connections')
      const json = await res.json()
      if (json.success) setConnections(json.data ?? [])
    } catch {
      // 조용히 실패
    }
  }

  async function handleAssign() {
    setAssignError(null)
    if (!selectedConnectionId) { setAssignError('직원을 선택해 주세요.'); return }
    setIsAssigning(true)
    try {
      const res = await fetch('/api/business/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: id,
          connection_id: selectedConnectionId,
          hourly_rate: hourlyRate ? Number(hourlyRate) : null,
        }),
      })
      const json = await res.json()
      if (!json.success) { setAssignError(json.error ?? '배정에 실패했습니다.'); return }
      setShowAssignModal(false)
      setSelectedConnectionId('')
      setHourlyRate('')
      await fetchSchedule()
    } catch {
      setAssignError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsAssigning(false)
    }
  }

  async function handleAttend(assignmentId: string) {
    setAttendingId(assignmentId)
    try {
      const res = await fetch(`/api/business/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attended_at: new Date().toISOString() }),
      })
      const json = await res.json()
      if (json.success) {
        setSchedule((prev) => prev
          ? {
              ...prev,
              assignments: prev.assignments.map((a) =>
                a.id === assignmentId ? { ...a, attended_at: json.data.attended_at } : a,
              ),
            }
          : prev,
        )
      }
    } catch {
      // silent fail
    } finally {
      setAttendingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface-sunken rounded-2xl animate-pulse" />
        ))}
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

  const timeRange = schedule.start_time
    ? `${schedule.start_time.slice(0, 5)}${schedule.end_time ? ` ~ ${schedule.end_time.slice(0, 5)}` : ''}`
    : null

  const client = schedule.client
  const hasWorkplaceInfo = !!(client?.elevator || client?.parking || client?.building_access || client?.access_method)
  const hasSiteInfo = !!(client?.care_scope || schedule.notes)

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-24">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="text-xl font-bold text-text-primary leading-tight truncate">
            {client?.name ?? '고객 미지정'}
          </h1>
          <ScheduleStatusBadge status={schedule.status} />
        </div>
        <button
          type="button"
          onClick={handleOpenEditModal}
          className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary shrink-0"
          title="수정"
        >
          <Pencil size={17} />
        </button>
      </div>

      {/* 일반정보 */}
      <section>
        <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">일반정보</p>
        <div className="bg-surface-sunken rounded-xl px-3 py-1">
          <Row label="날짜" value={dateStr} />
          {timeRange && <Row label="시간" value={timeRange} />}
          {schedule.fee != null && (
            <Row label="비용" value={`${schedule.fee.toLocaleString('ko-KR')}원`} />
          )}
          {client?.phone && (
            <Row
              label="연락처"
              value={
                <div className="flex items-center gap-1 justify-end">
                  <span>{client.phone}</span>
                  <a
                    href={`tel:${client.phone}`}
                    className="px-1.5 py-0.5 bg-brand-100 text-brand-600 rounded text-xs hover:bg-brand-200"
                  >
                    <Phone size={12} />
                  </a>
                </div>
              }
            />
          )}
          {client?.address && (
            <Row
              label="주소"
              value={
                <div className="flex items-center gap-1 justify-end min-w-0">
                  <span className="truncate">{client.address}</span>
                  <a
                    href={`https://map.kakao.com/?q=${encodeURIComponent(client.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs shrink-0 hover:bg-green-200"
                  >
                    <MapPin size={12} />
                  </a>
                </div>
              }
            />
          )}
          {(client?.business_hours_start || client?.business_hours_end) && (
            <Row
              label="영업시간"
              value={`${client?.business_hours_start ?? '-'} ~ ${client?.business_hours_end ?? '-'}`}
            />
          )}
          {client?.account_number && (
            <Row label="계좌번호" value={client.account_number} />
          )}
        </div>
      </section>

      {/* 작업장정보 */}
      <section>
        <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">작업장정보</p>
        <div className="border-2 border-green-200 rounded-xl px-3 py-1 bg-green-50/30">
          {client?.parking && <Row label="주차" value={client.parking} />}
          {client?.building_access && <Row label="건물출입" value={client.building_access} />}
          {client?.elevator && <Row label="엘리베이터" value={client.elevator} />}
          {client?.access_method && <Row label="출입방법" value={client.access_method} />}
          {!hasWorkplaceInfo && (
            <p className="text-xs text-text-tertiary py-2">작업장 정보가 없습니다.</p>
          )}
        </div>
      </section>

      {/* 시공정보 */}
      <section>
        <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">시공정보</p>
        <div className="border-2 border-green-200 rounded-xl p-3 bg-green-50/30 space-y-2">
          {client?.care_scope && (
            <div>
              <p className="text-xs text-state-success font-semibold mb-1">청소 범위</p>
              <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">{client.care_scope}</p>
            </div>
          )}
          {schedule.notes && (
            <div>
              <p className="text-xs text-text-secondary font-semibold mb-1">요청사항</p>
              <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">{schedule.notes}</p>
            </div>
          )}
          {!hasSiteInfo && (
            <p className="text-xs text-text-tertiary">시공 정보가 없습니다.</p>
          )}
        </div>
      </section>

      {/* 배정 인력 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">배정 인력</p>
          <Button size="sm" variant="secondary" onClick={handleOpenAssignModal}>
            <UserPlus size={13} className="mr-1" />
            추가
          </Button>
        </div>

        {schedule.assignments.length === 0 ? (
          <EmptyState
            icon={<UserPlus size={32} />}
            title="배정된 직원이 없어요"
            description="추가 버튼을 눌러 직원을 배정하세요."
            bordered
            size="sm"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {schedule.assignments.map((a) => {
              const name = getAssignmentName(a)
              const phone = getAssignmentPhone(a)
              const isAttended = !!a.attended_at
              const isAttendingNow = attendingId === a.id

              return (
                <div
                  key={a.id}
                  className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-4 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-surface-sunken flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-text-secondary">{name.charAt(0)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary text-sm">{name}</p>
                    {phone && (
                      <p className="text-xs text-text-secondary mt-0.5">{phone}</p>
                    )}
                    {isAttended && a.attended_at && (
                      <p className="text-xs text-state-success mt-0.5">
                        출근확인 {new Date(a.attended_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    {isAttended ? (
                      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium">
                        <Check size={13} />
                        출근완료
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isAttendingNow}
                        onClick={() => handleAttend(a.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-text-secondary hover:bg-surface-sunken transition-colors disabled:opacity-50"
                      >
                        <UserCheck size={13} />
                        {isAttendingNow ? '확인중...' : '출근체크'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 일정 수정 모달 */}
      <Modal
        open={showEditModal}
        onClose={() => { setShowEditModal(false); setEditError(null) }}
        title="일정 수정"
        footer={
          <>
            <Button fullWidth onClick={handleEditSubmit} isLoading={isEditing}>
              저장하기
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setShowEditModal(false)}>
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
            value={editForm.service_date}
            onChange={(e) => setEF('service_date')(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="시작 시간"
              type="time"
              value={editForm.start_time}
              onChange={(e) => setEF('start_time')(e.target.value)}
            />
            <Input
              label="종료 시간"
              type="time"
              value={editForm.end_time}
              onChange={(e) => setEF('end_time')(e.target.value)}
            />
          </div>
          <Input
            label="비용 (원)"
            type="number"
            value={editForm.fee}
            placeholder="예: 150000"
            onChange={(e) => setEF('fee')(e.target.value)}
          />
          <Input
            label="메모"
            value={editForm.notes}
            placeholder="메모 (선택)"
            onChange={(e) => setEF('notes')(e.target.value)}
          />

          <ModalSectionLabel>고객 정보</ModalSectionLabel>
          <Input
            label="업체명 / 이름"
            value={editForm.client_name}
            placeholder="예: 스타벅스 판교점"
            onChange={(e) => setEF('client_name')(e.target.value)}
          />
          <Input
            label="연락처"
            type="tel"
            value={editForm.client_phone}
            placeholder="010-0000-0000"
            onChange={(e) => setEF('client_phone')(e.target.value)}
          />
          <Input
            label="주소"
            value={editForm.client_address}
            placeholder="예: 성남시 분당구 판교역로..."
            onChange={(e) => setEF('client_address')(e.target.value)}
          />
          <Input
            label="담당자명"
            value={editForm.owner_name}
            placeholder="예: 홍길동"
            onChange={(e) => setEF('owner_name')(e.target.value)}
          />
          <Input
            label="이메일"
            type="email"
            value={editForm.email}
            placeholder="example@email.com"
            onChange={(e) => setEF('email')(e.target.value)}
          />
          <Input
            label="사업자번호"
            value={editForm.business_number}
            placeholder="000-00-00000"
            onChange={(e) => setEF('business_number')(e.target.value)}
          />
          <Input
            label="계좌번호"
            value={editForm.account_number}
            placeholder="예: 국민은행 123-456-789012"
            onChange={(e) => setEF('account_number')(e.target.value)}
          />

          <ModalSectionLabel>현장 정보</ModalSectionLabel>
          <SelectField
            label="엘리베이터"
            value={editForm.elevator}
            onChange={setEF('elevator')}
            options={['있음', '없음', '계단 전용']}
          />
          <SelectField
            label="주차"
            value={editForm.parking}
            onChange={setEF('parking')}
            options={['가능', '불가', '유료 주차']}
          />
          <SelectField
            label="건물출입신청여부"
            value={editForm.building_access}
            onChange={setEF('building_access')}
            options={['자유출입', '사전출입신청']}
          />
          <Input
            label="출입 방법 상세"
            value={editForm.access_method}
            placeholder="예: 비밀번호 1234"
            onChange={(e) => setEF('access_method')(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">청소 범위</label>
            <textarea
              value={editForm.care_scope}
              rows={3}
              placeholder="예: 주방 후드, 환풍구, 에어컨 실내기 3대"
              onChange={(e) => setEF('care_scope')(e.target.value)}
              className="block w-full rounded-md bg-surface border border-border text-text-primary placeholder:text-text-tertiary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">영업 시간</label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={editForm.business_hours_start}
                onChange={(e) => setEF('business_hours_start')(e.target.value)}
                className="flex-1 h-12 rounded-md bg-surface border border-border text-text-primary px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
              <span className="text-text-tertiary text-sm">~</span>
              <input
                type="time"
                value={editForm.business_hours_end}
                onChange={(e) => setEF('business_hours_end')(e.target.value)}
                className="flex-1 h-12 rounded-md bg-surface border border-border text-text-primary px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
          </div>

          {editError && (
            <p className="text-sm text-state-danger">{editError}</p>
          )}
        </div>
      </Modal>

      {/* 직원 배정 모달 */}
      <Modal
        open={showAssignModal}
        onClose={() => { setShowAssignModal(false); setAssignError(null) }}
        title="직원 배정"
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
              직원 선택
            </label>
            <select
              value={selectedConnectionId}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
              className="block w-full h-12 rounded-md bg-surface border border-border text-text-primary px-4 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            >
              <option value="">직원을 선택하세요</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name}{c.manual_phone ? ` · ${c.manual_phone}` : ''}
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
