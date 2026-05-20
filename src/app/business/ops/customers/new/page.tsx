'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// ─── 상수 ────────────────────────────────────────────────────
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

// ─── 타입 ────────────────────────────────────────────────────
interface NewForm {
  name: string
  phone: string
  address: string
  type: string
  owner_name: string
  email: string
  business_number: string
  account_number: string
  status: string
  contract_start_date: string
  contract_end_date: string
  billing_cycle: string
  unit_price: string
  visit_interval_days: string
  next_visit_date: string
  payment_method: string
  deposit: string
  supply_amount: string
  vat: string
  balance: string
  elevator: string
  parking: string
  building_access: string
  access_method: string
  door_password: string
  business_hours_start: string
  business_hours_end: string
  care_scope: string
  notes: string
  disposition: string
  admin_notes: string
}

const INITIAL: NewForm = {
  name: '', phone: '', address: '', type: '',
  owner_name: '', email: '', business_number: '', account_number: '',
  status: 'active', contract_start_date: '', contract_end_date: '',
  billing_cycle: '', unit_price: '', visit_interval_days: '', next_visit_date: '',
  payment_method: '', deposit: '', supply_amount: '', vat: '', balance: '',
  elevator: '', parking: '', building_access: '', access_method: '',
  door_password: '', business_hours_start: '', business_hours_end: '',
  care_scope: '', notes: '', disposition: '', admin_notes: '',
}

const NUMERIC_KEYS: (keyof NewForm)[] = [
  'unit_price', 'visit_interval_days', 'deposit', 'supply_amount', 'vat', 'balance',
]

// ─── 공통 컴포넌트 ────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider pt-4 pb-1">
      {children}
    </p>
  )
}

function SelectField({
  label, value, onChange, options, optionValues, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  optionValues?: string[]
  placeholder?: string
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

function TextareaField({
  label, value, onChange, placeholder, rows = 3,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1.5">{label}</label>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={onChange}
        className="block w-full rounded-md bg-surface border border-border text-text-primary placeholder:text-text-tertiary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none leading-normal"
      />
    </div>
  )
}

// ─── 메인 ────────────────────────────────────────────────────
export default function NewCustomerPage() {
  const router = useRouter()
  const [form, setForm] = useState<NewForm>(INITIAL)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setF = (key: keyof NewForm) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }))

  const setFInput = (key: keyof NewForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))

  async function handleSubmit() {
    setError(null)
    if (!form.name.trim()) {
      setError('고객명을 입력해 주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(form) as [keyof NewForm, string][]) {
        if (NUMERIC_KEYS.includes(k)) {
          payload[k] = v.trim() ? Number(v) : null
        } else {
          payload[k] = v.trim() || null
        }
      }
      const res = await fetch('/api/business/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '저장에 실패했습니다.')
        return
      }
      router.push(
        json.data?.id
          ? `/business/ops/customers/${json.data.id}`
          : '/business/ops/customers'
      )
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-2 sticky top-0 bg-surface z-10 border-b border-border-subtle">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-text-primary">고객 추가</h1>
      </div>

      {/* 폼 */}
      <div className="flex flex-col gap-3 px-4 pt-2">

        <SectionLabel>기본 정보</SectionLabel>
        <Input label="고객명 *" value={form.name}
          placeholder="예: 스타벅스 판교점" onChange={setFInput('name')} />
        <Input label="전화번호" type="tel" value={form.phone}
          placeholder="010-0000-0000" onChange={setFInput('phone')} />
        <Input label="주소" value={form.address}
          placeholder="예: 성남시 분당구 판교역로..." onChange={setFInput('address')} />
        <Input label="고객 유형" value={form.type}
          placeholder="예: VIP, 정기, 신규" onChange={setFInput('type')} />

        <SectionLabel>담당자</SectionLabel>
        <Input label="담당자명" value={form.owner_name}
          placeholder="예: 홍길동" onChange={setFInput('owner_name')} />
        <Input label="이메일" type="email" value={form.email}
          placeholder="example@email.com" onChange={setFInput('email')} />
        <Input label="사업자번호" value={form.business_number}
          placeholder="000-00-00000" onChange={setFInput('business_number')} />
        <Input label="계좌번호" value={form.account_number}
          placeholder="예: 국민은행 123-456-789012" onChange={setFInput('account_number')} />

        <SectionLabel>계약 정보</SectionLabel>
        <SelectField label="계약 상태" value={form.status} onChange={setF('status')}
          options={STATUS_OPTIONS.map((o) => o.label)}
          optionValues={STATUS_OPTIONS.map((o) => o.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="계약 시작일" type="date" value={form.contract_start_date}
            onChange={setFInput('contract_start_date')} />
          <Input label="계약 종료일" type="date" value={form.contract_end_date}
            onChange={setFInput('contract_end_date')} />
        </div>
        <SelectField label="청구 주기" value={form.billing_cycle} onChange={setF('billing_cycle')}
          options={BILLING_CYCLES} placeholder="선택 안 함" />
        <Input label="단가 (원/회)" type="number" value={form.unit_price}
          placeholder="예: 150000" onChange={setFInput('unit_price')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="방문 주기 (일)" type="number" value={form.visit_interval_days}
            placeholder="예: 14" onChange={setFInput('visit_interval_days')} />
          <Input label="다음 방문일" type="date" value={form.next_visit_date}
            onChange={setFInput('next_visit_date')} />
        </div>
        <SelectField label="결제 방법" value={form.payment_method} onChange={setF('payment_method')}
          options={PAYMENT_METHODS} placeholder="선택 안 함" />

        <SectionLabel>결제 현황</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <Input label="예약금" type="number" value={form.deposit}
            placeholder="0" onChange={setFInput('deposit')} />
          <Input label="공급가" type="number" value={form.supply_amount}
            placeholder="0" onChange={setFInput('supply_amount')} />
          <Input label="부가세" type="number" value={form.vat}
            placeholder="0" onChange={setFInput('vat')} />
          <Input label="잔금" type="number" value={form.balance}
            placeholder="0" onChange={setFInput('balance')} />
        </div>

        <SectionLabel>현장 정보</SectionLabel>
        <SelectField label="엘리베이터" value={form.elevator} onChange={setF('elevator')}
          options={ELEVATOR_OPTIONS} placeholder="선택 안 함" />
        <SelectField label="주차" value={form.parking} onChange={setF('parking')}
          options={PARKING_OPTIONS} placeholder="선택 안 함" />
        <SelectField label="건물출입신청" value={form.building_access} onChange={setF('building_access')}
          options={BUILDING_ACCESS_OPTIONS} placeholder="선택 안 함" />
        <Input label="출입 방법" value={form.access_method}
          placeholder="예: 비밀번호 1234" onChange={setFInput('access_method')} />
        <Input label="도어락" value={form.door_password}
          placeholder="예: 1234#" onChange={setFInput('door_password')} />
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">영업 시간</label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={form.business_hours_start}
              onChange={setFInput('business_hours_start')}
              className="flex-1 h-12 rounded-md bg-surface border border-border text-text-primary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
            <span className="text-text-tertiary text-sm">~</span>
            <input
              type="time"
              value={form.business_hours_end}
              onChange={setFInput('business_hours_end')}
              className="flex-1 h-12 rounded-md bg-surface border border-border text-text-primary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>
        </div>
        <TextareaField label="청소 범위" value={form.care_scope}
          placeholder="예: 주방 후드, 환풍구, 에어컨 실내기 3대"
          onChange={setFInput('care_scope')} />

        <SectionLabel>기타</SectionLabel>
        <SelectField label="고객 성향" value={form.disposition} onChange={setF('disposition')}
          options={DISPOSITION_OPTIONS} placeholder="선택 안 함" />
        <TextareaField label="메모" value={form.notes}
          placeholder="고객 메모 (고객에게 보일 수 있음)"
          onChange={setFInput('notes')} />
        <TextareaField label="관리자 메모" value={form.admin_notes}
          placeholder="내부 메모 (고객에게 노출되지 않음)"
          onChange={setFInput('admin_notes')} />

        {error && <p className="text-sm text-state-danger mt-1">{error}</p>}

        <div className="flex flex-col gap-2 mt-4">
          <Button fullWidth onClick={handleSubmit} isLoading={isSubmitting}>
            저장하기
          </Button>
          <Button variant="ghost" fullWidth onClick={() => router.back()}>
            취소
          </Button>
        </div>
      </div>
    </div>
  )
}
