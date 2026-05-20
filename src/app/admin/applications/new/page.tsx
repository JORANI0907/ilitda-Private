'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DEFAULT_PANEL_FIELDS } from '@/lib/settings-defaults'
import type { PanelConfig } from '@/types'

// ─── 상수 ────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  '신규', '견적발송', '예약확정', '예약1일전', '예약당일', '작업완료',
  '결제', '결제완료', '결제완료(잔금)', '계산서발행완료', '비과세',
  '카드결제 완료', '예약금환급완료', '예약금 입금', '예약취소', 'A/S방문', '방문견적',
]

// ─── 공통 컴포넌트 ────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider pt-4 pb-1">{children}</p>
  )
}

function SelectField({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string
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
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function TextareaField({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1.5">{label}</label>
      <textarea
        value={value} rows={rows} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-md bg-surface border border-border text-text-primary placeholder:text-text-tertiary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
      />
    </div>
  )
}

// ─── 메인 ────────────────────────────────────────────────────
interface Form {
  business_name: string; owner_name: string; platform_nickname: string
  phone: string; email: string; business_number: string; address: string; status: string
  elevator: string; parking: string; building_access: string
  access_method: string; door_password: string
  business_hours_start: string; business_hours_end: string
  payment_method: string; account_number: string
  deposit: string; supply_amount: string; vat: string; balance: string; unit_price_per_visit: string
  construction_date: string; construction_time: string
  care_scope: string; request_notes: string; admin_request_notes: string
  admin_notes: string; disposition: string
}

const INITIAL: Form = {
  business_name: '', owner_name: '', platform_nickname: '', phone: '', email: '',
  business_number: '', address: '', status: '신규', elevator: '', parking: '',
  building_access: '', access_method: '', door_password: '',
  business_hours_start: '', business_hours_end: '', payment_method: '', account_number: '',
  deposit: '', supply_amount: '', vat: '', balance: '', unit_price_per_visit: '',
  construction_date: '', construction_time: '', care_scope: '', request_notes: '',
  admin_request_notes: '', admin_notes: '', disposition: '',
}

const NUMERIC: (keyof Form)[] = ['deposit', 'supply_amount', 'vat', 'balance', 'unit_price_per_visit']

export default function NewApplicationPage() {
  const router = useRouter()
  const [form, setForm] = useState<Form>(INITIAL)
  const [panelConfig, setPanelConfig] = useState<PanelConfig | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings/panel')
      .then(r => r.json())
      .then(json => { if (json.success && json.data?.panel_config) setPanelConfig(json.data.panel_config) })
      .catch(() => {})
  }, [])

  const setF = (key: keyof Form) => (v: string) => setForm((p) => ({ ...p, [key]: v }))
  const setFE = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }))

  const resolveLabel = (key: string): string => {
    const override = panelConfig?.fields?.[key]?.label
    if (override) return override
    return DEFAULT_PANEL_FIELDS.find(f => f.key === key)?.label ?? key
  }

  const resolveOptions = (key: string): string[] => {
    const override = panelConfig?.fields?.[key]?.options
    if (override?.length) return override
    return DEFAULT_PANEL_FIELDS.find(f => f.key === key)?.options ?? []
  }

  async function handleSubmit() {
    setError(null)
    if (!form.business_name.trim()) { setError('업체명을 입력해 주세요.'); return }
    if (!form.phone.trim()) { setError('연락처를 입력해 주세요.'); return }
    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(form) as [keyof Form, string][]) {
        payload[k] = NUMERIC.includes(k) ? (v.trim() ? Number(v) : null) : (v.trim() || null)
      }
      const res = await fetch('/api/admin/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error ?? '저장 실패'); return }
      router.push('/admin/applications')
    } catch { setError('네트워크 오류') } finally { setIsSubmitting(false) }
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-2 sticky top-0 bg-surface z-10 border-b border-border-subtle">
        <button type="button" onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-text-primary">서비스 추가</h1>
      </div>

      <div className="flex flex-col gap-3 px-4 pt-2">
        <SectionLabel>기본 정보</SectionLabel>
        <Input label={resolveLabel('business_name') + ' *'} value={form.business_name} placeholder="예: 스타벅스 강남점" onChange={setFE('business_name')} />
        <Input label={resolveLabel('owner_name')} value={form.owner_name} placeholder="홍길동" onChange={setFE('owner_name')} />
        <Input label={resolveLabel('platform_nickname')} value={form.platform_nickname} placeholder="플랫폼 닉네임" onChange={setFE('platform_nickname')} />
        <Input label={resolveLabel('phone') + ' *'} type="tel" value={form.phone} placeholder="010-0000-0000" onChange={setFE('phone')} />
        <Input label={resolveLabel('email')} type="email" value={form.email} placeholder="example@email.com" onChange={setFE('email')} />
        <Input label={resolveLabel('business_number')} value={form.business_number} placeholder="000-00-00000" onChange={setFE('business_number')} />
        <Input label={resolveLabel('address')} value={form.address} placeholder="주소 입력" onChange={setFE('address')} />

        <SectionLabel>상태 / 일정</SectionLabel>
        <SelectField label="진행 상태" value={form.status} onChange={setF('status')} options={STATUS_OPTIONS} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={resolveLabel('construction_date')} type="date" value={form.construction_date} onChange={setFE('construction_date')} />
          <Input label={resolveLabel('construction_time')} type="time" value={form.construction_time} onChange={setFE('construction_time')} />
        </div>

        <SectionLabel>현장 정보</SectionLabel>
        <SelectField label={resolveLabel('elevator')} value={form.elevator} onChange={setF('elevator')} options={resolveOptions('elevator')} placeholder="선택" />
        <SelectField label={resolveLabel('parking')} value={form.parking} onChange={setF('parking')} options={resolveOptions('parking')} placeholder="선택" />
        <SelectField label={resolveLabel('building_access')} value={form.building_access} onChange={setF('building_access')} options={resolveOptions('building_access')} placeholder="선택" />
        <Input label={resolveLabel('access_method')} value={form.access_method} placeholder="예: 비밀번호 입력" onChange={setFE('access_method')} />
        <Input label={resolveLabel('door_password')} value={form.door_password} placeholder="예: 1234#" onChange={setFE('door_password')} />
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">영업 시간</label>
          <div className="flex items-center gap-2">
            <input type="time" value={form.business_hours_start} onChange={setFE('business_hours_start')}
              className="flex-1 h-12 rounded-md bg-surface border border-border text-text-primary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
            <span className="text-text-tertiary text-sm">~</span>
            <input type="time" value={form.business_hours_end} onChange={setFE('business_hours_end')}
              className="flex-1 h-12 rounded-md bg-surface border border-border text-text-primary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
          </div>
        </div>

        <SectionLabel>결제 정보</SectionLabel>
        <SelectField label={resolveLabel('payment_method')} value={form.payment_method} onChange={setF('payment_method')} options={resolveOptions('payment_method')} placeholder="선택" />
        <Input label={resolveLabel('account_number')} value={form.account_number} placeholder="은행 + 계좌번호" onChange={setFE('account_number')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="단가 (원)" type="number" value={form.unit_price_per_visit} placeholder="0" onChange={setFE('unit_price_per_visit')} />
          <Input label="예약금" type="number" value={form.deposit} placeholder="0" onChange={setFE('deposit')} />
          <Input label={resolveLabel('supply_amount')} type="number" value={form.supply_amount} placeholder="0" onChange={setFE('supply_amount')} />
          <Input label={resolveLabel('vat')} type="number" value={form.vat} placeholder="0" onChange={setFE('vat')} />
          <Input label={resolveLabel('balance')} type="number" value={form.balance} placeholder="0" onChange={setFE('balance')} />
        </div>

        <SectionLabel>요청사항</SectionLabel>
        <TextareaField label={resolveLabel('care_scope')} value={form.care_scope} onChange={setF('care_scope')} placeholder="청소 범위 입력" />
        <TextareaField label={resolveLabel('request_notes')} value={form.request_notes} onChange={setF('request_notes')} placeholder="고객 요청사항" />
        <TextareaField label={resolveLabel('admin_request_notes')} value={form.admin_request_notes} onChange={setF('admin_request_notes')} placeholder="관리자 추가 요청사항" />

        <SectionLabel>기타</SectionLabel>
        <SelectField label={resolveLabel('disposition')} value={form.disposition} onChange={setF('disposition')} options={resolveOptions('disposition')} placeholder="선택" />
        <TextareaField label={resolveLabel('admin_notes')} value={form.admin_notes} onChange={setF('admin_notes')} placeholder="내부 메모" />

        {error && <p className="text-sm text-state-danger mt-1">{error}</p>}

        <div className="flex flex-col gap-2 mt-4">
          <Button fullWidth onClick={handleSubmit} isLoading={isSubmitting}>저장하기</Button>
          <Button variant="ghost" fullWidth onClick={() => router.back()}>취소</Button>
        </div>
      </div>
    </div>
  )
}
