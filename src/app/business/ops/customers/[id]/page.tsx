'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Pencil, Star, Phone, MapPin, CalendarDays,
  BadgeCheck, FileText, Banknote, Clock, Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ScheduleStatusBadge } from '@/components/ui/Badge'

// ─── 상수 ────────────────────────────────────────────────────
const SERVICE_TYPES = ['1회성케어', '정기딥케어', '정기엔드케어']
const BILLING_CYCLES = ['월간', '격주', '주간', '연간']
const PAYMENT_METHODS = ['현금', '카드', '계좌이체', '현금(부가세 X)']
const ELEVATOR_OPTIONS = ['있음', '없음', '계단 전용']
const PARKING_OPTIONS = ['가능', '불가', '유료 주차']
const BUILDING_ACCESS_OPTIONS = ['자유출입', '사전출입신청']
const STATUS_OPTIONS = [
  { value: 'active', label: '활성' },
  { value: 'paused', label: '일시중지' },
  { value: 'terminated', label: '해지' },
]
const DISPOSITION_OPTIONS = ['호의', '보통', '주의']

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active:     { label: '활성',     className: 'bg-emerald-100 text-emerald-700' },
  paused:     { label: '일시중지', className: 'bg-amber-100 text-amber-700' },
  terminated: { label: '해지',     className: 'bg-state-danger-bg text-state-danger' },
}

const SERVICE_BADGE: Record<string, string> = {
  '1회성케어':    'bg-surface-sunken text-text-secondary',
  '정기딥케어':   'bg-brand-100 text-brand-700',
  '정기엔드케어': 'bg-purple-100 text-purple-700',
}

// ─── 타입 ────────────────────────────────────────────────────
interface ScheduleRecord {
  id: string
  service_date: string
  start_time: string | null
  end_time: string | null
  status: string
  fee: number | null
  notes: string | null
  service_type: string | null
  assignments?: { id: string; status: string; connection?: { display_name: string } | null }[]
}

interface ClientDetail {
  id: string
  name: string
  phone: string | null
  address: string | null
  type: string | null
  service_type: string | null
  is_favorite: boolean
  notes: string | null
  owner_name: string | null
  email: string | null
  business_number: string | null
  account_number: string | null
  elevator: string | null
  building_access: string | null
  access_method: string | null
  parking: string | null
  door_password: string | null
  business_hours_start: string | null
  business_hours_end: string | null
  care_scope: string | null
  visit_interval_days: number | null
  next_visit_date: string | null
  unit_price: number | null
  billing_cycle: string | null
  payment_method: string | null
  deposit: number | null
  supply_amount: number | null
  vat: number | null
  balance: number | null
  status: string | null
  contract_start_date: string | null
  contract_end_date: string | null
  disposition: string | null
  admin_notes: string | null
  schedules: ScheduleRecord[]
}

// ─── 수정 폼 타입 ─────────────────────────────────────────────
interface EditForm {
  name: string
  phone: string
  address: string
  service_type: string
  status: string
  owner_name: string
  email: string
  business_number: string
  account_number: string
  elevator: string
  parking: string
  building_access: string
  access_method: string
  care_scope: string
  door_password: string
  business_hours_start: string
  business_hours_end: string
  visit_interval_days: string
  next_visit_date: string
  unit_price: string
  billing_cycle: string
  payment_method: string
  deposit: string
  supply_amount: string
  vat: string
  balance: string
  contract_start_date: string
  contract_end_date: string
  disposition: string
  notes: string
  admin_notes: string
}

const EMPTY_EDIT: EditForm = {
  name: '', phone: '', address: '', service_type: '', status: 'active',
  owner_name: '', email: '', business_number: '', account_number: '',
  elevator: '', parking: '', building_access: '', access_method: '',
  care_scope: '', door_password: '', business_hours_start: '', business_hours_end: '',
  visit_interval_days: '', next_visit_date: '', unit_price: '', billing_cycle: '',
  payment_method: '', deposit: '', supply_amount: '', vat: '', balance: '',
  contract_start_date: '', contract_end_date: '', disposition: '',
  notes: '', admin_notes: '',
}

// ─── 헬퍼 ────────────────────────────────────────────────────
const fmt = (n: number | null | undefined) =>
  n == null ? '-' : `${n.toLocaleString('ko-KR')}원`

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value || value === '-' || value === '') return null
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border-subtle last:border-0">
      <span className="w-28 shrink-0 text-xs text-text-tertiary pt-0.5">{label}</span>
      <span className="text-sm text-text-primary break-keep flex-1">{value}</span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 mt-1">
      {children}
    </p>
  )
}

function SelectField({
  label, value, onChange, options, optionValues, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void
  options: string[]; optionValues?: string[]; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full h-12 rounded-md bg-surface border border-border text-text-primary px-4 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt, i) => (
          <option key={optionValues?.[i] ?? opt} value={optionValues?.[i] ?? opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}

// ─── 메인 ────────────────────────────────────────────────────
export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchClient = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/business/customers/${id}`)
      const json = await res.json()
      if (!json.success) { setError(json.error ?? '불러오기에 실패했습니다.'); return }
      setClient(json.data)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => { fetchClient() }, [fetchClient])

  function openEdit() {
    if (!client) return
    setEditForm({
      name: client.name,
      phone: client.phone ?? '',
      address: client.address ?? '',
      service_type: client.service_type ?? '',
      status: client.status ?? 'active',
      owner_name: client.owner_name ?? '',
      email: client.email ?? '',
      business_number: client.business_number ?? '',
      account_number: client.account_number ?? '',
      elevator: client.elevator ?? '',
      parking: client.parking ?? '',
      building_access: client.building_access ?? '',
      access_method: client.access_method ?? '',
      care_scope: client.care_scope ?? '',
      door_password: client.door_password ?? '',
      business_hours_start: client.business_hours_start ?? '',
      business_hours_end: client.business_hours_end ?? '',
      visit_interval_days: client.visit_interval_days?.toString() ?? '',
      next_visit_date: client.next_visit_date ?? '',
      unit_price: client.unit_price?.toString() ?? '',
      billing_cycle: client.billing_cycle ?? '',
      payment_method: client.payment_method ?? '',
      deposit: client.deposit?.toString() ?? '',
      supply_amount: client.supply_amount?.toString() ?? '',
      vat: client.vat?.toString() ?? '',
      balance: client.balance?.toString() ?? '',
      contract_start_date: client.contract_start_date ?? '',
      contract_end_date: client.contract_end_date ?? '',
      disposition: client.disposition ?? '',
      notes: client.notes ?? '',
      admin_notes: client.admin_notes ?? '',
    })
    setFormError(null)
    setShowEdit(true)
  }

  const setE = (key: keyof EditForm) => (v: string) =>
    setEditForm((prev) => ({ ...prev, [key]: v }))

  const setEInput = (key: keyof EditForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setEditForm((prev) => ({ ...prev, [key]: e.target.value }))

  async function handleEditSubmit() {
    setFormError(null)
    if (!editForm.name.trim()) { setFormError('고객명을 입력해 주세요.'); return }
    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = {}
      const numericKeys: (keyof EditForm)[] = ['visit_interval_days', 'unit_price', 'deposit', 'supply_amount', 'vat', 'balance']
      for (const [k, v] of Object.entries(editForm) as [keyof EditForm, string][]) {
        if (numericKeys.includes(k)) {
          payload[k] = v.trim() ? Number(v) : null
        } else {
          payload[k] = v.trim() || null
        }
      }
      const res = await fetch(`/api/business/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) { setFormError(json.error ?? '저장에 실패했습니다.'); return }
      setShowEdit(false)
      await fetchClient()
    } catch {
      setFormError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function toggleFavorite() {
    if (!client) return
    const next = !client.is_favorite
    setClient((prev) => prev ? { ...prev, is_favorite: next } : prev)
    await fetch(`/api/business/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: next }),
    })
  }

  // ─── 로딩 / 에러 ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6">
        <div className="h-6 w-32 bg-surface-sunken rounded animate-pulse" />
        <div className="h-40 bg-surface-sunken rounded-2xl animate-pulse" />
        <div className="h-40 bg-surface-sunken rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 pt-20">
        <p className="text-sm text-state-danger">{error ?? '고객을 찾을 수 없습니다.'}</p>
        <Button variant="secondary" size="sm" onClick={fetchClient}>재시도</Button>
      </div>
    )
  }

  const sortedSchedules = [...(client.schedules ?? [])].sort(
    (a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
  )
  const statusInfo = client.status ? STATUS_BADGE[client.status] : null
  const serviceCls = client.service_type ? SERVICE_BADGE[client.service_type] : null
  const totalAmount = (client.supply_amount ?? 0) + (client.vat ?? 0)

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
        <h1 className="flex-1 text-xl font-bold text-text-primary leading-tight truncate">{client.name}</h1>
        <button type="button" onClick={toggleFavorite} className="p-1">
          <Star size={20} className={client.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-text-tertiary'} />
        </button>
        <Button size="sm" variant="secondary" onClick={openEdit}>
          <Pencil size={14} />
          수정
        </Button>
      </div>

      {/* 배지 */}
      <div className="flex items-center gap-2 flex-wrap">
        {serviceCls && (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${serviceCls}`}>
            {client.service_type}
          </span>
        )}
        {statusInfo && (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        )}
        {client.disposition && (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-sunken text-text-secondary">
            {client.disposition}
          </span>
        )}
      </div>

      {/* 연락처 */}
      {(client.phone || client.owner_name || client.email) && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Phone size={16} className="text-text-tertiary" />
            <p className="text-sm font-semibold text-text-primary">연락처</p>
          </div>
          <Row label="전화번호" value={
            client.phone ? (
              <a href={`tel:${client.phone}`} className="text-brand-600 font-medium">
                {client.phone}
              </a>
            ) : null
          } />
          <Row label="담당자" value={client.owner_name} />
          <Row label="이메일" value={client.email} />
        </Card>
      )}

      {/* 계약 정보 */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-3">
          <BadgeCheck size={16} className="text-text-tertiary" />
          <p className="text-sm font-semibold text-text-primary">계약 정보</p>
        </div>
        <Row label="서비스 유형" value={client.service_type} />
        <Row label="계약 상태" value={statusInfo?.label} />
        <Row label="청구 주기" value={client.billing_cycle} />
        <Row label="단가" value={client.unit_price ? `${client.unit_price.toLocaleString('ko-KR')}원/회` : null} />
        <Row label="방문 주기" value={client.visit_interval_days ? `${client.visit_interval_days}일마다` : null} />
        <Row label="다음 방문" value={client.next_visit_date} />
        <Row label="결제 방법" value={client.payment_method} />
        <Row label="계약 시작" value={client.contract_start_date} />
        <Row label="계약 종료" value={client.contract_end_date} />
      </Card>

      {/* 결제 현황 */}
      {(client.deposit || client.supply_amount || client.vat || client.balance) && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Banknote size={16} className="text-text-tertiary" />
            <p className="text-sm font-semibold text-text-primary">결제 현황</p>
          </div>
          <Row label="예약금" value={fmt(client.deposit)} />
          <Row label="공급가" value={fmt(client.supply_amount)} />
          <Row label="부가세" value={fmt(client.vat)} />
          {totalAmount > 0 && (
            <Row label="총액" value={
              <span className="font-semibold text-brand-600">{fmt(totalAmount)}</span>
            } />
          )}
          <Row label="잔금" value={fmt(client.balance)} />
        </Card>
      )}

      {/* 현장 정보 */}
      {(client.address || client.elevator || client.care_scope) && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-text-tertiary" />
            <p className="text-sm font-semibold text-text-primary">현장 정보</p>
          </div>
          <Row label="주소" value={client.address} />
          <Row label="엘리베이터" value={client.elevator} />
          <Row label="주차" value={client.parking} />
          <Row label="건물출입" value={client.building_access} />
          <Row label="출입 방법" value={client.access_method} />
          <Row label="도어락" value={client.door_password} />
          <Row label="영업 시간" value={
            client.business_hours_start
              ? `${client.business_hours_start} ~ ${client.business_hours_end ?? ''}`
              : null
          } />
          <Row label="청소 범위" value={client.care_scope} />
        </Card>
      )}

      {/* 사업자 정보 */}
      {(client.business_number || client.account_number) && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={16} className="text-text-tertiary" />
            <p className="text-sm font-semibold text-text-primary">사업자 정보</p>
          </div>
          <Row label="사업자번호" value={client.business_number} />
          <Row label="계좌번호" value={client.account_number} />
        </Card>
      )}

      {/* 메모 */}
      {(client.notes || client.admin_notes) && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-text-tertiary" />
            <p className="text-sm font-semibold text-text-primary">메모</p>
          </div>
          {client.notes && (
            <p className="text-sm text-text-secondary break-keep leading-relaxed">{client.notes}</p>
          )}
          {client.admin_notes && (
            <>
              <p className="text-xs text-text-tertiary mt-3 mb-1">관리자 메모</p>
              <p className="text-sm text-text-secondary break-keep leading-relaxed">{client.admin_notes}</p>
            </>
          )}
        </Card>
      )}

      {/* 일정 이력 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-text-tertiary" />
          <p className="text-sm font-semibold text-text-primary">일정 이력 ({sortedSchedules.length})</p>
        </div>

        {sortedSchedules.length === 0 && (
          <p className="text-sm text-text-tertiary text-center py-4">등록된 일정이 없어요.</p>
        )}

        {sortedSchedules.map((s) => (
          <Card
            key={s.id}
            padding="md"
            className="cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => router.push(`/business/ops/schedules/${s.id}`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-text-primary">{s.service_date}</p>
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Clock size={11} className="text-text-tertiary" />
                  {s.start_time ? s.start_time.slice(0, 5) : '시간 미정'}
                  {s.end_time && ` ~ ${s.end_time.slice(0, 5)}`}
                </div>
                {s.assignments?.[0]?.connection?.display_name && (
                  <p className="text-xs text-text-tertiary">{s.assignments[0].connection.display_name}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <ScheduleStatusBadge status={s.status} />
                {s.fee && (
                  <p className="text-xs text-text-secondary">{s.fee.toLocaleString('ko-KR')}원</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 수정 모달 */}
      <Modal
        open={showEdit}
        onClose={() => { setShowEdit(false); setFormError(null) }}
        title="고객 수정"
        footer={
          <>
            <Button fullWidth onClick={handleEditSubmit} isLoading={isSubmitting}>저장하기</Button>
            <Button variant="ghost" fullWidth onClick={() => setShowEdit(false)}>취소</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <SectionLabel>기본 정보</SectionLabel>
          <Input label="고객명 *" value={editForm.name} onChange={setEInput('name')} />
          <Input label="전화번호" type="tel" value={editForm.phone} onChange={setEInput('phone')} />
          <Input label="주소" value={editForm.address} onChange={setEInput('address')} />
          <SelectField label="서비스 유형" value={editForm.service_type} onChange={setE('service_type')}
            options={SERVICE_TYPES} placeholder="선택 안 함" />
          <SelectField label="계약 상태" value={editForm.status} onChange={setE('status')}
            options={STATUS_OPTIONS.map((o) => o.label)}
            optionValues={STATUS_OPTIONS.map((o) => o.value)}
            placeholder="선택 안 함"
          />
          <SelectField label="고객 성향" value={editForm.disposition} onChange={setE('disposition')}
            options={DISPOSITION_OPTIONS} placeholder="선택 안 함" />

          <SectionLabel>계약 정보</SectionLabel>
          <Input label="계약 시작일" type="date" value={editForm.contract_start_date}
            onChange={setEInput('contract_start_date')} />
          <Input label="계약 종료일" type="date" value={editForm.contract_end_date}
            onChange={setEInput('contract_end_date')} />
          <SelectField label="청구 주기" value={editForm.billing_cycle} onChange={setE('billing_cycle')}
            options={BILLING_CYCLES} placeholder="선택 안 함" />
          <Input label="단가 (원/회)" type="number" value={editForm.unit_price}
            placeholder="예: 150000" onChange={setEInput('unit_price')} />
          <Input label="방문 주기 (일)" type="number" value={editForm.visit_interval_days}
            placeholder="예: 14" onChange={setEInput('visit_interval_days')} />
          <Input label="다음 방문일" type="date" value={editForm.next_visit_date}
            onChange={setEInput('next_visit_date')} />
          <SelectField label="결제 방법" value={editForm.payment_method} onChange={setE('payment_method')}
            options={PAYMENT_METHODS} placeholder="선택 안 함" />

          <SectionLabel>결제 현황</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Input label="예약금" type="number" value={editForm.deposit}
              placeholder="0" onChange={setEInput('deposit')} />
            <Input label="공급가" type="number" value={editForm.supply_amount}
              placeholder="0" onChange={setEInput('supply_amount')} />
            <Input label="부가세" type="number" value={editForm.vat}
              placeholder="0" onChange={setEInput('vat')} />
            <Input label="잔금" type="number" value={editForm.balance}
              placeholder="0" onChange={setEInput('balance')} />
          </div>

          <SectionLabel>담당자</SectionLabel>
          <Input label="담당자명" value={editForm.owner_name} onChange={setEInput('owner_name')} />
          <Input label="이메일" type="email" value={editForm.email} onChange={setEInput('email')} />
          <Input label="사업자번호" value={editForm.business_number} onChange={setEInput('business_number')} />
          <Input label="계좌번호" value={editForm.account_number}
            placeholder="예: 국민은행 123-456-789012" onChange={setEInput('account_number')} />

          <SectionLabel>현장 정보</SectionLabel>
          <SelectField label="엘리베이터" value={editForm.elevator} onChange={setE('elevator')}
            options={ELEVATOR_OPTIONS} placeholder="선택 안 함" />
          <SelectField label="주차" value={editForm.parking} onChange={setE('parking')}
            options={PARKING_OPTIONS} placeholder="선택 안 함" />
          <SelectField label="건물출입신청" value={editForm.building_access} onChange={setE('building_access')}
            options={BUILDING_ACCESS_OPTIONS} placeholder="선택 안 함" />
          <Input label="출입 방법" value={editForm.access_method}
            placeholder="예: 비밀번호 1234" onChange={setEInput('access_method')} />
          <Input label="도어락" value={editForm.door_password}
            placeholder="예: 1234#" onChange={setEInput('door_password')} />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">영업 시간</label>
            <div className="flex items-center gap-2">
              <input type="time" value={editForm.business_hours_start}
                onChange={setEInput('business_hours_start')}
                className="flex-1 h-12 rounded-md bg-surface border border-border text-text-primary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
              <span className="text-text-tertiary">~</span>
              <input type="time" value={editForm.business_hours_end}
                onChange={setEInput('business_hours_end')}
                className="flex-1 h-12 rounded-md bg-surface border border-border text-text-primary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">청소 범위</label>
            <textarea
              value={editForm.care_scope} rows={3}
              placeholder="예: 주방 후드, 환풍구, 에어컨 실내기 3대"
              onChange={setEInput('care_scope')}
              className="block w-full rounded-md bg-surface border border-border text-text-primary placeholder:text-text-tertiary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
            />
          </div>

          <SectionLabel>메모</SectionLabel>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">메모</label>
            <textarea
              value={editForm.notes} rows={3}
              placeholder="고객 메모 (고객에게 보일 수 있음)"
              onChange={setEInput('notes')}
              className="block w-full rounded-md bg-surface border border-border text-text-primary placeholder:text-text-tertiary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">관리자 메모</label>
            <textarea
              value={editForm.admin_notes} rows={3}
              placeholder="내부 관리자 메모 (외부 비공개)"
              onChange={setEInput('admin_notes')}
              className="block w-full rounded-md bg-surface border border-border text-text-primary placeholder:text-text-tertiary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
            />
          </div>

          {formError && (
            <p className="text-sm text-state-danger">{formError}</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
