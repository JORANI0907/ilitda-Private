'use client'

import { useState } from 'react'
import { X, Star, Phone, ExternalLink, Megaphone, Save, Trash2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ServiceApplication, ApplicationStatus, NotifyLog } from '@/types'

// ─── 상수 ────────────────────────────────────────────────────
const ALL_STATUSES: ApplicationStatus[] = [
  '신규', '견적발송', '예약확정', '예약1일전', '예약당일', '작업완료',
  '결제', '결제완료', '결제완료(잔금)', '계산서발행완료', '비과세',
  '카드결제 완료', '예약금환급완료', '예약금 입금', '예약취소', 'A/S방문', '방문견적',
]

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  '신규':          'bg-brand-100 text-brand-700',
  '견적발송':      'bg-indigo-100 text-indigo-700',
  '예약확정':      'bg-green-100 text-green-800',
  '예약1일전':     'bg-sky-100 text-sky-700',
  '예약당일':      'bg-blue-100 text-blue-800',
  '작업완료':      'bg-orange-100 text-orange-700',
  '결제':          'bg-amber-100 text-amber-700',
  '결제완료':      'bg-gray-100 text-gray-600',
  '결제완료(잔금)': 'bg-emerald-100 text-emerald-700',
  '계산서발행완료': 'bg-gray-100 text-gray-500',
  '비과세':        'bg-gray-100 text-gray-500',
  '카드결제 완료': 'bg-gray-100 text-gray-500',
  '예약금환급완료': 'bg-gray-100 text-gray-500',
  '예약금 입금':   'bg-teal-100 text-teal-700',
  '예약취소':      'bg-red-100 text-red-600',
  'A/S방문':       'bg-yellow-100 text-yellow-700',
  '방문견적':      'bg-purple-100 text-purple-700',
}

const NOTIFY_TYPES = [
  '예약확정알림', '예약1일전알림', '예약당일알림', '작업완료알림',
  '결제알림', '결제완료알림', '결제완료알림(잔금)', '계산서발행완료알림',
  '예약금 입금완료 알림', '예약금환급완료알림',
  '예약취소알림', 'A/S방문알림', '방문견적알림',
]

const DISPOSITION_OPTIONS = ['호의', '보통', '주의']
const ELEVATOR_OPTIONS = ['있음', '없음', '계단 전용']
const PARKING_OPTIONS = ['가능', '불가', '유료 주차']
const ACCESS_OPTIONS = ['자유출입', '사전출입신청']
const PAYMENT_OPTIONS = ['현금', '카드', '계좌이체', '현금(부가세 X)']

// ─── 유틸 ────────────────────────────────────────────────────
function fmtMoney(v: number | null) {
  if (v == null) return '-'
  return v.toLocaleString('ko-KR') + '원'
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-border-subtle last:border-0">
      <span className="text-xs font-medium text-text-tertiary w-24 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 text-sm text-text-primary">{children}</div>
    </div>
  )
}

function EditInput({
  value, onChange, placeholder, type = 'text',
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 rounded-md bg-surface border border-border text-sm text-text-primary px-3 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
    />
  )
}

function EditSelect({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 rounded-md bg-surface border border-border text-sm text-text-primary px-3 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function EditTextarea({
  value, onChange, placeholder, rows = 3,
}: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md bg-surface border border-border text-sm text-text-primary px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
    />
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider pt-4 pb-1">
      {children}
    </p>
  )
}

// ─── 메인 패널 ────────────────────────────────────────────────
interface Props {
  app: ServiceApplication
  onClose: () => void
  onUpdate: (updated: ServiceApplication) => void
  onDelete: (id: string) => void
}

type FormState = {
  owner_name: string
  platform_nickname: string
  phone: string
  email: string
  business_name: string
  business_number: string
  address: string
  elevator: string
  building_access: string
  access_method: string
  parking: string
  door_password: string
  business_hours_start: string
  business_hours_end: string
  payment_method: string
  account_number: string
  deposit: string
  supply_amount: string
  vat: string
  balance: string
  unit_price_per_visit: string
  request_notes: string
  admin_request_notes: string
  care_scope: string
  disposition: string
  admin_notes: string
  construction_date: string
  construction_time: string
  drive_folder_url: string
}

function toForm(app: ServiceApplication): FormState {
  return {
    owner_name:         app.owner_name ?? '',
    platform_nickname:  app.platform_nickname ?? '',
    phone:              app.phone ?? '',
    email:              app.email ?? '',
    business_name:      app.business_name ?? '',
    business_number:    app.business_number ?? '',
    address:            app.address ?? '',
    elevator:           app.elevator ?? '',
    building_access:    app.building_access ?? '',
    access_method:      app.access_method ?? '',
    parking:            app.parking ?? '',
    door_password:      app.door_password ?? '',
    business_hours_start: app.business_hours_start ?? '',
    business_hours_end:   app.business_hours_end ?? '',
    payment_method:     app.payment_method ?? '',
    account_number:     app.account_number ?? '',
    deposit:            app.deposit?.toString() ?? '',
    supply_amount:      app.supply_amount?.toString() ?? '',
    vat:                app.vat?.toString() ?? '',
    balance:            app.balance?.toString() ?? '',
    unit_price_per_visit: app.unit_price_per_visit?.toString() ?? '',
    request_notes:      app.request_notes ?? '',
    admin_request_notes: app.admin_request_notes ?? '',
    care_scope:         app.care_scope ?? '',
    disposition:        app.disposition ?? '',
    admin_notes:        app.admin_notes ?? '',
    construction_date:  app.construction_date ?? '',
    construction_time:  app.construction_time ?? '',
    drive_folder_url:   app.drive_folder_url ?? '',
  }
}

export function ApplicationPanel({ app, onClose, onUpdate, onDelete }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(app))
  const [status, setStatus] = useState<ApplicationStatus>(app.status)
  const [isFavorite, setIsFavorite] = useState(app.is_favorite)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [notifyType, setNotifyType] = useState(NOTIFY_TYPES[0])
  const [isSendingNotify, setIsSendingNotify] = useState(false)
  const [notifyError, setNotifyError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setF = (key: keyof FormState) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }))

  async function handleSave() {
    setError(null)
    setIsSaving(true)
    try {
      const numericKeys: (keyof FormState)[] = ['deposit', 'supply_amount', 'vat', 'balance', 'unit_price_per_visit']
      const payload: Record<string, unknown> = { status, is_favorite: isFavorite }
      for (const [k, v] of Object.entries(form) as [keyof FormState, string][]) {
        payload[k] = numericKeys.includes(k) ? (v.trim() ? Number(v) : null) : (v.trim() || null)
      }
      const res = await fetch(`/api/admin/applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error ?? '저장 실패'); return }
      onUpdate(json.data)
    } catch { setError('네트워크 오류') } finally { setIsSaving(false) }
  }

  async function handleDelete() {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return
    setIsDeleting(true)
    await fetch(`/api/admin/applications/${app.id}`, { method: 'DELETE' })
    onDelete(app.id)
  }

  async function handleNotify() {
    setNotifyError(null)
    setIsSendingNotify(true)
    try {
      const res = await fetch(`/api/admin/applications/${app.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyType }),
      })
      const json = await res.json()
      if (!json.success) { setNotifyError(json.error ?? '발송 실패'); return }
      alert(`${notifyType} 발송 완료`)
    } catch { setNotifyError('네트워크 오류') } finally { setIsSendingNotify(false) }
  }

  const notifyLogs: NotifyLog[] = (app.notification_log as NotifyLog[]) ?? []

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 패널 */}
      <div className="relative ml-auto w-full max-w-lg bg-surface h-full overflow-y-auto shadow-modal">
        {/* 헤더 */}
        <div className="sticky top-0 bg-surface z-10 border-b border-border-subtle px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={onClose} className="p-1 text-text-secondary hover:text-text-primary">
            <X size={20} />
          </button>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600'}`}>
            {status}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setIsFavorite((v) => !v)}
            className="p-1 text-text-tertiary hover:text-amber-400 transition-colors"
          >
            <Star size={18} className={isFavorite ? 'fill-amber-400 text-amber-400' : ''} />
          </button>
          <a href={`tel:${form.phone}`} className="p-1 text-text-secondary hover:text-brand-600">
            <Phone size={18} />
          </a>
        </div>

        <div className="px-4 pb-8">
          {/* 상태 변경 */}
          <SectionTitle>상태</SectionTitle>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              className="w-full h-10 rounded-lg bg-surface border border-border text-sm text-text-primary px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 appearance-none"
            >
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-3 text-text-tertiary pointer-events-none" />
          </div>

          {/* 기본 정보 */}
          <SectionTitle>기본 정보</SectionTitle>
          <div className="bg-surface rounded-2xl border border-border-subtle px-3 shadow-flat">
            <FieldRow label="업체명"><EditInput value={form.business_name} onChange={setF('business_name')} placeholder="업체명" /></FieldRow>
            <FieldRow label="담당자명"><EditInput value={form.owner_name} onChange={setF('owner_name')} placeholder="홍길동" /></FieldRow>
            <FieldRow label="닉네임"><EditInput value={form.platform_nickname} onChange={setF('platform_nickname')} placeholder="플랫폼 닉네임" /></FieldRow>
            <FieldRow label="연락처"><EditInput value={form.phone} onChange={setF('phone')} type="tel" placeholder="010-0000-0000" /></FieldRow>
            <FieldRow label="이메일"><EditInput value={form.email} onChange={setF('email')} type="email" placeholder="example@email.com" /></FieldRow>
            <FieldRow label="사업자번호"><EditInput value={form.business_number} onChange={setF('business_number')} placeholder="000-00-00000" /></FieldRow>
            <FieldRow label="주소"><EditInput value={form.address} onChange={setF('address')} placeholder="주소" /></FieldRow>
          </div>

          {/* 현장 정보 */}
          <SectionTitle>현장 정보</SectionTitle>
          <div className="bg-surface rounded-2xl border border-border-subtle px-3 shadow-flat">
            <FieldRow label="엘리베이터"><EditSelect value={form.elevator} onChange={setF('elevator')} options={ELEVATOR_OPTIONS} placeholder="선택" /></FieldRow>
            <FieldRow label="주차"><EditSelect value={form.parking} onChange={setF('parking')} options={PARKING_OPTIONS} placeholder="선택" /></FieldRow>
            <FieldRow label="건물출입"><EditSelect value={form.building_access} onChange={setF('building_access')} options={ACCESS_OPTIONS} placeholder="선택" /></FieldRow>
            <FieldRow label="출입방법"><EditInput value={form.access_method} onChange={setF('access_method')} placeholder="예: 비밀번호 입력" /></FieldRow>
            <FieldRow label="도어락"><EditInput value={form.door_password} onChange={setF('door_password')} placeholder="예: 1234#" /></FieldRow>
            <FieldRow label="영업시간">
              <div className="flex items-center gap-2">
                <input type="time" value={form.business_hours_start} onChange={(e) => setF('business_hours_start')(e.target.value)}
                  className="flex-1 h-9 rounded-md bg-surface border border-border text-sm text-text-primary px-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
                <span className="text-text-tertiary text-xs">~</span>
                <input type="time" value={form.business_hours_end} onChange={(e) => setF('business_hours_end')(e.target.value)}
                  className="flex-1 h-9 rounded-md bg-surface border border-border text-sm text-text-primary px-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
              </div>
            </FieldRow>
          </div>

          {/* 일정 */}
          <SectionTitle>일정</SectionTitle>
          <div className="bg-surface rounded-2xl border border-border-subtle px-3 shadow-flat">
            <FieldRow label="시공일"><EditInput value={form.construction_date} onChange={setF('construction_date')} type="date" /></FieldRow>
            <FieldRow label="시공시간"><EditInput value={form.construction_time} onChange={setF('construction_time')} type="time" /></FieldRow>
          </div>

          {/* 청소 범위 / 요청사항 */}
          <SectionTitle>요청사항</SectionTitle>
          <div className="bg-surface rounded-2xl border border-border-subtle px-3 shadow-flat">
            <FieldRow label="청소 범위">
              <EditTextarea value={form.care_scope} onChange={setF('care_scope')} placeholder="청소 범위 입력" rows={2} />
            </FieldRow>
            <FieldRow label="고객 요청">
              <EditTextarea value={form.request_notes} onChange={setF('request_notes')} placeholder="고객 요청사항" rows={2} />
            </FieldRow>
            <FieldRow label="관리자 추가">
              <EditTextarea value={form.admin_request_notes} onChange={setF('admin_request_notes')} placeholder="관리자 추가 요청사항" rows={2} />
            </FieldRow>
          </div>

          {/* 결제 */}
          <SectionTitle>결제 정보</SectionTitle>
          <div className="bg-surface rounded-2xl border border-border-subtle px-3 shadow-flat">
            <FieldRow label="결제 방법"><EditSelect value={form.payment_method} onChange={setF('payment_method')} options={PAYMENT_OPTIONS} placeholder="선택" /></FieldRow>
            <FieldRow label="계좌번호"><EditInput value={form.account_number} onChange={setF('account_number')} placeholder="은행 + 계좌번호" /></FieldRow>
            <FieldRow label="단가"><EditInput value={form.unit_price_per_visit} onChange={setF('unit_price_per_visit')} type="number" placeholder="0" /></FieldRow>
            <FieldRow label="예약금"><EditInput value={form.deposit} onChange={setF('deposit')} type="number" placeholder="0" /></FieldRow>
            <FieldRow label="공급가"><EditInput value={form.supply_amount} onChange={setF('supply_amount')} type="number" placeholder="0" /></FieldRow>
            <FieldRow label="부가세"><EditInput value={form.vat} onChange={setF('vat')} type="number" placeholder="0" /></FieldRow>
            <FieldRow label="잔금"><EditInput value={form.balance} onChange={setF('balance')} type="number" placeholder="0" /></FieldRow>
          </div>

          {/* 드라이브 */}
          <SectionTitle>구글 드라이브</SectionTitle>
          <div className="bg-surface rounded-2xl border border-border-subtle px-3 shadow-flat">
            <FieldRow label="폴더 URL">
              <div className="flex items-center gap-2">
                <div className="flex-1"><EditInput value={form.drive_folder_url} onChange={setF('drive_folder_url')} placeholder="https://drive.google.com/..." /></div>
                {form.drive_folder_url && (
                  <a href={form.drive_folder_url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1 text-brand-600">
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </FieldRow>
          </div>

          {/* 기타 */}
          <SectionTitle>기타</SectionTitle>
          <div className="bg-surface rounded-2xl border border-border-subtle px-3 shadow-flat">
            <FieldRow label="고객 성향"><EditSelect value={form.disposition} onChange={setF('disposition')} options={DISPOSITION_OPTIONS} placeholder="선택" /></FieldRow>
            <FieldRow label="관리자 메모">
              <EditTextarea value={form.admin_notes} onChange={setF('admin_notes')} placeholder="내부 메모" rows={3} />
            </FieldRow>
          </div>

          {/* 알림 발송 */}
          <SectionTitle>알림 발송 (SMS)</SectionTitle>
          <div className="bg-surface rounded-2xl border border-border-subtle p-3 shadow-flat flex flex-col gap-2">
            <select
              value={notifyType}
              onChange={(e) => setNotifyType(e.target.value)}
              className="w-full h-10 rounded-lg bg-surface border border-border text-sm text-text-primary px-3 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            >
              {NOTIFY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleNotify}
              isLoading={isSendingNotify}
              fullWidth
            >
              <Megaphone size={14} />
              {form.phone || '연락처 없음'}으로 발송
            </Button>
            {notifyError && <p className="text-xs text-state-danger">{notifyError}</p>}
          </div>

          {/* 알림 기록 */}
          {notifyLogs.length > 0 && (
            <>
              <SectionTitle>알림 기록</SectionTitle>
              <div className="flex flex-col gap-1">
                {[...notifyLogs].reverse().slice(0, 10).map((log, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-text-secondary bg-surface rounded-lg px-3 py-2 border border-border-subtle">
                    <span className="font-medium text-text-primary">{log.type}</span>
                    <span className="text-text-tertiary">{new Date(log.sent_at).toLocaleString('ko-KR')}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 저장 / 삭제 */}
          {error && <p className="mt-4 text-sm text-state-danger">{error}</p>}
          <div className="flex gap-2 mt-6">
            <Button fullWidth onClick={handleSave} isLoading={isSaving}>
              <Save size={15} />
              저장
            </Button>
            <Button variant="ghost" onClick={handleDelete} isLoading={isDeleting} className="shrink-0 px-3 text-state-danger hover:bg-state-danger-bg">
              <Trash2 size={15} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
