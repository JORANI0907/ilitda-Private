'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Building2, MapPin, Calendar,
  CreditCard, ClipboardList, Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DEFAULT_PANEL_FIELDS, SECTION_BORDER_COLOR, SECTION_TITLE_COLOR } from '@/lib/settings-defaults'
import type { PanelConfig } from '@/types'

// ─── 상수 ────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  '신규', '견적발송', '예약확정', '예약1일전', '예약당일', '서비스완료',
  '결제', '결제완료', '결제완료(잔금)', '계산서발행완료', '비과세',
  '카드결제 완료', '예약금환급완료', '예약금 입금', '예약취소', 'A/S방문', '방문견적',
]

const SECTION_HEADER_BG: Record<string, string> = {
  blue: 'bg-blue-50', green: 'bg-green-50', violet: 'bg-violet-50',
  amber: 'bg-amber-50', teal: 'bg-teal-50', gray: 'bg-gray-50',
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────
function FormSection({ color, icon, title, children }: {
  color: string; icon: React.ReactNode; title: string; children: React.ReactNode
}) {
  const border = SECTION_BORDER_COLOR[color] ?? 'border-gray-200'
  const titleColor = SECTION_TITLE_COLOR[color] ?? 'text-gray-500'
  const headerBg = SECTION_HEADER_BG[color] ?? 'bg-gray-50'
  return (
    <div className={`bg-surface rounded-2xl border-2 ${border} shadow-flat overflow-hidden`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 ${headerBg}`}>
        <span className={titleColor}>{icon}</span>
        <p className={`text-xs font-bold uppercase tracking-wider ${titleColor}`}>{title}</p>
      </div>
      <div className="px-4 py-4 flex flex-col gap-3">
        {children}
      </div>
    </div>
  )
}

function FL({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-xs font-medium text-text-tertiary mb-1.5">
      {children}{required && <span className="ml-0.5 text-state-danger">*</span>}
    </p>
  )
}

const inputCls = 'block w-full h-10 rounded-lg bg-surface-sunken border border-border text-text-primary text-sm px-3 placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500'

function SI({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: React.ChangeEventHandler<HTMLInputElement>; placeholder?: string; type?: string
}) {
  return <input type={type} value={value} placeholder={placeholder} onChange={onChange} className={inputCls} />
}

function SS({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function ST({ value, onChange, placeholder, rows = 2 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea value={value} rows={rows} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full rounded-lg bg-surface-sunken border border-border text-text-primary text-sm px-3 py-2.5 placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none" />
  )
}

// ─── 타입 ────────────────────────────────────────────────────
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

// ─── 메인 ────────────────────────────────────────────────────
export default function NewApplicationPage() {
  const router = useRouter()
  const [form, setForm] = useState<Form>(INITIAL)
  const [panelConfig, setPanelConfig] = useState<PanelConfig | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vatEnabled, setVatEnabled] = useState(true)

  useEffect(() => {
    fetch('/api/admin/settings/panel')
      .then(r => r.json())
      .then(json => { if (json.success && json.data?.panel_config) setPanelConfig(json.data.panel_config) })
      .catch(() => {})
  }, [])

  const setF = (key: keyof Form) => (v: string) => setForm(p => ({ ...p, [key]: v }))
  const setFE = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }))

  // ─── 결제 자동 계산 ───────────────────────────────────────
  const unitPrice = Number(form.unit_price_per_visit) || 0
  const vatAmount = vatEnabled ? Math.round(unitPrice * 0.1) : 0
  const totalAmount = unitPrice + vatAmount
  const depositAmount = Number(form.deposit) || 0
  const balanceAmount = totalAmount - depositAmount

  const lbl = (key: string): string => {
    const ov = panelConfig?.fields?.[key]?.label
    return ov ?? DEFAULT_PANEL_FIELDS.find(f => f.key === key)?.label ?? key
  }
  const opts = (key: string): string[] => {
    const ov = panelConfig?.fields?.[key]?.options
    if (ov?.length) return ov
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
      payload.vat = vatAmount
      payload.supply_amount = totalAmount
      payload.balance = balanceAmount
      const res = await fetch('/api/admin/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error ?? '저장 실패'); return }
      router.push('/business/applications')
    } catch { setError('네트워크 오류') } finally { setIsSubmitting(false) }
  }

  return (
    <div className="min-h-screen bg-surface-sunken">
      {/* 상단 헤더 */}
      <div className="sticky top-0 z-10 bg-surface border-b border-border-subtle">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => router.back()}
            className="p-1 -ml-1 text-text-tertiary hover:text-text-primary transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-text-primary flex-1">서비스 추가</h1>
          <Button size="sm" onClick={handleSubmit} isLoading={isSubmitting}>저장</Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pt-4 pb-28">

        {/* 진행 상태 */}
        <div className="bg-surface rounded-2xl border border-border-subtle shadow-flat px-4 py-3">
          <FL>진행 상태</FL>
          <SS value={form.status} onChange={setF('status')} options={STATUS_OPTIONS} />
        </div>

        {/* 기본 정보 */}
        <FormSection color="blue" icon={<Building2 size={14} />} title="기본 정보">
          <div>
            <FL required>{lbl('business_name')}</FL>
            <SI value={form.business_name} onChange={setFE('business_name')} placeholder="예: 스타벅스 강남점" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FL>{lbl('owner_name')}</FL>
              <SI value={form.owner_name} onChange={setFE('owner_name')} placeholder="홍길동" />
            </div>
            <div>
              <FL>{lbl('platform_nickname')}</FL>
              <SI value={form.platform_nickname} onChange={setFE('platform_nickname')} placeholder="닉네임" />
            </div>
          </div>
          <div>
            <FL required>{lbl('phone')}</FL>
            <SI type="tel" value={form.phone} onChange={setFE('phone')} placeholder="010-0000-0000" />
          </div>
          <div>
            <FL>{lbl('email')}</FL>
            <SI type="email" value={form.email} onChange={setFE('email')} placeholder="example@email.com" />
          </div>
          <div>
            <FL>{lbl('business_number')}</FL>
            <SI value={form.business_number} onChange={setFE('business_number')} placeholder="000-00-00000" />
          </div>
          <div>
            <FL>{lbl('address')}</FL>
            <SI value={form.address} onChange={setFE('address')} placeholder="주소 입력" />
          </div>
        </FormSection>

        {/* 일정 */}
        <FormSection color="violet" icon={<Calendar size={14} />} title="일정">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FL>{lbl('construction_date')}</FL>
              <SI type="date" value={form.construction_date} onChange={setFE('construction_date')} />
            </div>
            <div>
              <FL>{lbl('construction_time')}</FL>
              <SI type="time" value={form.construction_time} onChange={setFE('construction_time')} />
            </div>
          </div>
        </FormSection>

        {/* 현장 정보 */}
        <FormSection color="green" icon={<MapPin size={14} />} title="현장 정보">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FL>{lbl('elevator')}</FL>
              <SS value={form.elevator} onChange={setF('elevator')} options={opts('elevator')} placeholder="선택" />
            </div>
            <div>
              <FL>{lbl('parking')}</FL>
              <SS value={form.parking} onChange={setF('parking')} options={opts('parking')} placeholder="선택" />
            </div>
          </div>
          <div>
            <FL>{lbl('building_access')}</FL>
            <SS value={form.building_access} onChange={setF('building_access')} options={opts('building_access')} placeholder="선택" />
          </div>
          <div>
            <FL>{lbl('access_method')}</FL>
            <SI value={form.access_method} onChange={setFE('access_method')} placeholder="예: 비밀번호 입력" />
          </div>
          <div>
            <FL>{lbl('door_password')}</FL>
            <SI value={form.door_password} onChange={setFE('door_password')} placeholder="예: 1234#" />
          </div>
          <div>
            <FL>영업 시간</FL>
            <div className="flex items-center gap-2">
              <input type="time" value={form.business_hours_start} onChange={setFE('business_hours_start')} className={inputCls + ' flex-1'} />
              <span className="text-text-tertiary text-sm shrink-0">~</span>
              <input type="time" value={form.business_hours_end} onChange={setFE('business_hours_end')} className={inputCls + ' flex-1'} />
            </div>
          </div>
        </FormSection>

        {/* 결제 정보 */}
        <FormSection color="teal" icon={<CreditCard size={14} />} title="결제 정보">
          <div>
            <FL>{lbl('payment_method')}</FL>
            <SS value={form.payment_method} onChange={setF('payment_method')} options={opts('payment_method')} placeholder="선택" />
          </div>
          <div>
            <FL>{lbl('account_number')}</FL>
            <SI value={form.account_number} onChange={setFE('account_number')} placeholder="은행 + 계좌번호" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FL>단가 (원)</FL>
              <SI type="number" value={form.unit_price_per_visit} onChange={setFE('unit_price_per_visit')} placeholder="0" />
            </div>
            <div>
              <FL>예약금</FL>
              <SI type="number" value={form.deposit} onChange={setFE('deposit')} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-xs font-medium text-text-tertiary">부가세</p>
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={vatEnabled}
                    onChange={(e) => setVatEnabled(e.target.checked)}
                    className="w-3 h-3 rounded accent-brand-600"
                  />
                  <span className="text-[10px] text-text-tertiary">10%</span>
                </label>
              </div>
              <div className="h-10 rounded-lg bg-surface-sunken border border-border flex items-center px-3">
                <span className="text-sm text-text-secondary">
                  {vatAmount.toLocaleString('ko-KR')}원
                </span>
              </div>
            </div>
            <div>
              <FL>총액</FL>
              <div className="h-10 rounded-lg bg-surface-sunken border border-border flex items-center px-3">
                <span className="text-sm font-semibold text-brand-600">
                  {totalAmount.toLocaleString('ko-KR')}원
                </span>
              </div>
            </div>
            <div className="col-span-2">
              <FL>잔금</FL>
              <div className="h-10 rounded-lg bg-surface-sunken border border-border flex items-center px-3">
                <span className={`text-sm font-medium ${balanceAmount > 0 ? 'text-state-warning' : 'text-text-tertiary'}`}>
                  {balanceAmount.toLocaleString('ko-KR')}원
                </span>
              </div>
            </div>
          </div>
        </FormSection>

        {/* 요청사항 */}
        <FormSection color="amber" icon={<ClipboardList size={14} />} title="요청사항">
          <div>
            <FL>{lbl('care_scope')}</FL>
            <ST value={form.care_scope} onChange={setF('care_scope')} placeholder="서비스 내용 입력" />
          </div>
          <div>
            <FL>{lbl('request_notes')}</FL>
            <ST value={form.request_notes} onChange={setF('request_notes')} placeholder="고객 요청사항" />
          </div>
          <div>
            <FL>{lbl('admin_request_notes')}</FL>
            <ST value={form.admin_request_notes} onChange={setF('admin_request_notes')} placeholder="관리자 추가 요청사항" />
          </div>
        </FormSection>

        {/* 기타 */}
        <FormSection color="gray" icon={<Settings2 size={14} />} title="기타">
          <div>
            <FL>{lbl('disposition')}</FL>
            <SS value={form.disposition} onChange={setF('disposition')} options={opts('disposition')} placeholder="선택" />
          </div>
          <div>
            <FL>{lbl('admin_notes')}</FL>
            <ST value={form.admin_notes} onChange={setF('admin_notes')} placeholder="내부 메모" rows={3} />
          </div>
        </FormSection>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-state-danger">{error}</p>
          </div>
        )}

        <Button variant="ghost" fullWidth onClick={() => router.back()}>취소</Button>
      </div>
    </div>
  )
}
