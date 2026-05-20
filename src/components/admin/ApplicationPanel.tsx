'use client'

import { useState } from 'react'
import { X, Star, Phone, Megaphone, Save, Trash2, ChevronDown, FolderOpen, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  DEFAULT_PANEL_FIELDS,
  PANEL_SECTIONS,
  SECTION_BORDER_COLOR,
  SECTION_TITLE_COLOR,
} from '@/lib/settings-defaults'
import type { ServiceApplication, ApplicationStatus, NotifyLog, PanelConfig } from '@/types'

// ─── 상수 ────────────────────────────────────────────────────
const ALL_STATUSES: ApplicationStatus[] = [
  '신규', '견적발송', '예약확정', '예약1일전', '예약당일', '작업완료',
  '결제', '결제완료', '결제완료(잔금)', '계산서발행완료', '비과세',
  '카드결제 완료', '예약금환급완료', '예약금 입금', '예약취소', 'A/S방문', '방문견적',
]

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  '신규':           'bg-brand-100 text-brand-700',
  '견적발송':       'bg-indigo-100 text-indigo-700',
  '예약확정':       'bg-green-100 text-green-800',
  '예약1일전':      'bg-sky-100 text-sky-700',
  '예약당일':       'bg-blue-100 text-blue-800',
  '작업완료':       'bg-orange-100 text-orange-700',
  '결제':           'bg-amber-100 text-amber-700',
  '결제완료':       'bg-gray-100 text-gray-600',
  '결제완료(잔금)': 'bg-emerald-100 text-emerald-700',
  '계산서발행완료': 'bg-gray-100 text-gray-500',
  '비과세':         'bg-gray-100 text-gray-500',
  '카드결제 완료':  'bg-gray-100 text-gray-500',
  '예약금환급완료': 'bg-gray-100 text-gray-500',
  '예약금 입금':    'bg-teal-100 text-teal-700',
  '예약취소':       'bg-red-100 text-red-600',
  'A/S방문':        'bg-yellow-100 text-yellow-700',
  '방문견적':       'bg-purple-100 text-purple-700',
}

const NOTIFY_TYPES = [
  '예약확정알림', '예약1일전알림', '예약당일알림', '작업완료알림',
  '결제알림', '결제완료알림', '결제완료알림(잔금)', '계산서발행완료알림',
  '예약금 입금완료 알림', '예약금환급완료알림',
  '예약취소알림', 'A/S방문알림', '방문견적알림',
]

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

interface SectionTitleProps {
  children: React.ReactNode
  color?: string
}
function SectionTitle({ children, color = 'gray' }: SectionTitleProps) {
  const colorClass = SECTION_TITLE_COLOR[color] ?? 'text-text-tertiary'
  return (
    <p className={`text-xs font-bold uppercase tracking-wider pt-4 pb-1 ${colorClass}`}>
      {children}
    </p>
  )
}

// ─── FormState ───────────────────────────────────────────────
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
}

function toForm(app: ServiceApplication): FormState {
  return {
    owner_name:           app.owner_name ?? '',
    platform_nickname:    app.platform_nickname ?? '',
    phone:                app.phone ?? '',
    email:                app.email ?? '',
    business_name:        app.business_name ?? '',
    business_number:      app.business_number ?? '',
    address:              app.address ?? '',
    elevator:             app.elevator ?? '',
    building_access:      app.building_access ?? '',
    access_method:        app.access_method ?? '',
    parking:              app.parking ?? '',
    door_password:        app.door_password ?? '',
    payment_method:       app.payment_method ?? '',
    account_number:       app.account_number ?? '',
    deposit:              app.deposit?.toString() ?? '',
    supply_amount:        app.supply_amount?.toString() ?? '',
    vat:                  app.vat?.toString() ?? '',
    balance:              app.balance?.toString() ?? '',
    unit_price_per_visit: app.unit_price_per_visit?.toString() ?? '',
    request_notes:        app.request_notes ?? '',
    admin_request_notes:  app.admin_request_notes ?? '',
    care_scope:           app.care_scope ?? '',
    disposition:          app.disposition ?? '',
    admin_notes:          app.admin_notes ?? '',
    construction_date:    app.construction_date ?? '',
    construction_time:    app.construction_time ?? '',
  }
}

// ─── Props ───────────────────────────────────────────────────
interface Props {
  app: ServiceApplication
  onClose: () => void
  onUpdate: (updated: ServiceApplication) => void
  onDelete: (id: string) => void
  panelConfig?: PanelConfig
}

// ─── 메인 패널 ────────────────────────────────────────────────
export function ApplicationPanel({ app, onClose, onUpdate, onDelete, panelConfig }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(app))
  const [status, setStatus] = useState<ApplicationStatus>(app.status)
  const [isFavorite, setIsFavorite] = useState(app.is_favorite)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [notifyType, setNotifyType] = useState(NOTIFY_TYPES[0])
  const [isSendingNotify, setIsSendingNotify] = useState(false)
  const [notifyError, setNotifyError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [driveUrl, setDriveUrl] = useState<string | null>(app.drive_folder_url ?? null)
  const [isDriveLoading, setIsDriveLoading] = useState(false)
  const [driveError, setDriveError] = useState<string | null>(null)

  const setF = (key: keyof FormState) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }))

  // ─── panelConfig 헬퍼 ─────────────────────────────────────
  const resolveLabel = (key: string): string => {
    const override = panelConfig?.fields?.[key]?.label
    if (override) return override
    return DEFAULT_PANEL_FIELDS.find((f) => f.key === key)?.label ?? key
  }

  const resolvePlaceholder = (key: string): string => {
    const override = panelConfig?.fields?.[key]?.placeholder
    if (override !== undefined) return override
    return DEFAULT_PANEL_FIELDS.find((f) => f.key === key)?.placeholder ?? ''
  }

  const resolveOptions = (key: string): string[] => {
    const override = panelConfig?.fields?.[key]?.options
    if (override?.length) return override
    return DEFAULT_PANEL_FIELDS.find((f) => f.key === key)?.options ?? []
  }

  // ─── 저장 ─────────────────────────────────────────────────
  async function handleSave() {
    setError(null)
    setIsSaving(true)
    try {
      const numericKeys: (keyof FormState)[] = [
        'deposit', 'supply_amount', 'vat', 'balance', 'unit_price_per_visit',
      ]
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

  async function handleCreateDriveFolder() {
    setDriveError(null)
    setIsDriveLoading(true)
    try {
      const res = await fetch(`/api/admin/applications/${app.id}/drive`, { method: 'POST' })
      const json = await res.json()
      if (!json.success) { setDriveError(json.error ?? '폴더 생성 실패'); return }
      setDriveUrl(json.data.folderUrl)
    } catch { setDriveError('네트워크 오류') } finally { setIsDriveLoading(false) }
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

  // ─── 결제 공급대가 자동 계산 ──────────────────────────────
  const supplyTotal = (Number(form.supply_amount) || 0) + (Number(form.vat) || 0)

  // ─── 섹션별 border color ──────────────────────────────────
  const sectionBorder = (sectionId: string): string => {
    const sec = PANEL_SECTIONS.find((s) => s.id === sectionId)
    return SECTION_BORDER_COLOR[sec?.color ?? 'gray'] ?? 'border-gray-200'
  }

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
          <SectionTitle color="blue">
            {PANEL_SECTIONS.find((s) => s.id === 'basic')?.title}
          </SectionTitle>
          <div className={`bg-surface rounded-2xl border-2 ${sectionBorder('basic')} px-3 shadow-flat`}>
            <FieldRow label={resolveLabel('business_name')}>
              <EditInput value={form.business_name} onChange={setF('business_name')} placeholder={resolvePlaceholder('business_name')} />
            </FieldRow>
            <FieldRow label={resolveLabel('owner_name')}>
              <EditInput value={form.owner_name} onChange={setF('owner_name')} placeholder={resolvePlaceholder('owner_name')} />
            </FieldRow>
            <FieldRow label={resolveLabel('platform_nickname')}>
              <EditInput value={form.platform_nickname} onChange={setF('platform_nickname')} placeholder={resolvePlaceholder('platform_nickname')} />
            </FieldRow>
            <FieldRow label={resolveLabel('phone')}>
              <EditInput value={form.phone} onChange={setF('phone')} type="tel" placeholder={resolvePlaceholder('phone')} />
            </FieldRow>
            <FieldRow label={resolveLabel('email')}>
              <EditInput value={form.email} onChange={setF('email')} type="email" placeholder={resolvePlaceholder('email')} />
            </FieldRow>
            <FieldRow label={resolveLabel('business_number')}>
              <EditInput value={form.business_number} onChange={setF('business_number')} placeholder={resolvePlaceholder('business_number')} />
            </FieldRow>
            <FieldRow label={resolveLabel('address')}>
              <EditInput value={form.address} onChange={setF('address')} placeholder={resolvePlaceholder('address')} />
            </FieldRow>
          </div>

          {/* 현장 정보 */}
          <SectionTitle color="green">
            {PANEL_SECTIONS.find((s) => s.id === 'site')?.title}
          </SectionTitle>
          <div className={`bg-surface rounded-2xl border-2 ${sectionBorder('site')} px-3 shadow-flat`}>
            <FieldRow label={resolveLabel('elevator')}>
              <EditSelect value={form.elevator} onChange={setF('elevator')} options={resolveOptions('elevator')} placeholder="선택" />
            </FieldRow>
            <FieldRow label={resolveLabel('parking')}>
              <EditSelect value={form.parking} onChange={setF('parking')} options={resolveOptions('parking')} placeholder="선택" />
            </FieldRow>
            <FieldRow label={resolveLabel('building_access')}>
              <EditSelect value={form.building_access} onChange={setF('building_access')} options={resolveOptions('building_access')} placeholder="선택" />
            </FieldRow>
            <FieldRow label={resolveLabel('access_method')}>
              <EditInput value={form.access_method} onChange={setF('access_method')} placeholder={resolvePlaceholder('access_method')} />
            </FieldRow>
            <FieldRow label={resolveLabel('door_password')}>
              <EditInput value={form.door_password} onChange={setF('door_password')} placeholder={resolvePlaceholder('door_password')} />
            </FieldRow>
          </div>

          {/* 일정 */}
          <SectionTitle color="violet">
            {PANEL_SECTIONS.find((s) => s.id === 'schedule')?.title}
          </SectionTitle>
          <div className={`bg-surface rounded-2xl border-2 ${sectionBorder('schedule')} px-3 shadow-flat`}>
            <FieldRow label={resolveLabel('construction_date')}>
              <EditInput value={form.construction_date} onChange={setF('construction_date')} type="date" />
            </FieldRow>
            <FieldRow label={resolveLabel('construction_time')}>
              <EditInput value={form.construction_time} onChange={setF('construction_time')} type="time" />
            </FieldRow>
          </div>

          {/* 요청사항 */}
          <SectionTitle color="amber">
            {PANEL_SECTIONS.find((s) => s.id === 'request')?.title}
          </SectionTitle>
          <div className={`bg-surface rounded-2xl border-2 ${sectionBorder('request')} px-3 shadow-flat`}>
            <FieldRow label={resolveLabel('care_scope')}>
              <EditTextarea value={form.care_scope} onChange={setF('care_scope')} placeholder={resolvePlaceholder('care_scope')} rows={2} />
            </FieldRow>
            <FieldRow label={resolveLabel('request_notes')}>
              <EditTextarea value={form.request_notes} onChange={setF('request_notes')} placeholder={resolvePlaceholder('request_notes')} rows={2} />
            </FieldRow>
            <FieldRow label={resolveLabel('admin_request_notes')}>
              <EditTextarea value={form.admin_request_notes} onChange={setF('admin_request_notes')} placeholder={resolvePlaceholder('admin_request_notes')} rows={2} />
            </FieldRow>
          </div>

          {/* 결제 정보 */}
          <SectionTitle color="teal">
            {PANEL_SECTIONS.find((s) => s.id === 'payment')?.title}
          </SectionTitle>
          <div className={`bg-surface rounded-2xl border-2 ${sectionBorder('payment')} px-3 shadow-flat`}>
            <FieldRow label={resolveLabel('payment_method')}>
              <EditSelect value={form.payment_method} onChange={setF('payment_method')} options={resolveOptions('payment_method')} placeholder="선택" />
            </FieldRow>
            <FieldRow label={resolveLabel('account_number')}>
              <EditInput value={form.account_number} onChange={setF('account_number')} placeholder={resolvePlaceholder('account_number')} />
            </FieldRow>
            <FieldRow label={resolveLabel('supply_amount')}>
              <EditInput value={form.supply_amount} onChange={setF('supply_amount')} type="number" placeholder={resolvePlaceholder('supply_amount')} />
            </FieldRow>
            <FieldRow label={resolveLabel('vat')}>
              <EditInput value={form.vat} onChange={setF('vat')} type="number" placeholder={resolvePlaceholder('vat')} />
            </FieldRow>
            <FieldRow label={resolveLabel('supply_total')}>
              <span className="text-sm text-text-primary font-medium">
                {form.supply_amount || form.vat
                  ? supplyTotal.toLocaleString('ko-KR') + '원'
                  : '-'}
              </span>
            </FieldRow>
            <FieldRow label={resolveLabel('balance')}>
              <EditInput value={form.balance} onChange={setF('balance')} type="number" placeholder={resolvePlaceholder('balance')} />
            </FieldRow>
          </div>

          {/* 기타 */}
          <SectionTitle color="gray">
            {PANEL_SECTIONS.find((s) => s.id === 'misc')?.title}
          </SectionTitle>
          <div className={`bg-surface rounded-2xl border-2 ${sectionBorder('misc')} px-3 shadow-flat`}>
            <FieldRow label={resolveLabel('disposition')}>
              <EditSelect value={form.disposition} onChange={setF('disposition')} options={resolveOptions('disposition')} placeholder="선택" />
            </FieldRow>
            <FieldRow label={resolveLabel('admin_notes')}>
              <EditTextarea value={form.admin_notes} onChange={setF('admin_notes')} placeholder={resolvePlaceholder('admin_notes')} rows={3} />
            </FieldRow>
          </div>

          {/* 구글 드라이브 */}
          <SectionTitle>작업 폴더 (Google Drive)</SectionTitle>
          <div className="bg-surface rounded-2xl border border-border-subtle p-3 shadow-flat flex flex-col gap-2">
            {driveUrl ? (
              <>
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-brand-600 font-medium hover:underline"
                >
                  <FolderOpen size={15} />
                  폴더 열기 (작업전 / 작업후)
                  <ExternalLink size={13} className="opacity-60" />
                </a>
                <p className="text-xs text-text-tertiary">링크 아는 누구나 업로드 가능 · 작업자에게 링크를 공유하세요</p>
                <Button size="sm" variant="ghost" onClick={handleCreateDriveFolder} isLoading={isDriveLoading} fullWidth>
                  폴더 재생성
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-text-tertiary">생성하면 작업전/작업후 폴더가 자동으로 만들어집니다.</p>
                <Button size="sm" variant="secondary" onClick={handleCreateDriveFolder} isLoading={isDriveLoading} fullWidth>
                  <FolderOpen size={14} />
                  작업 폴더 생성
                </Button>
              </>
            )}
            {driveError && <p className="text-xs text-state-danger">{driveError}</p>}
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
