'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Star, Phone, Megaphone, Save, Trash2, ChevronDown, FolderOpen, ExternalLink, Users, Copy, Check, MapPin } from 'lucide-react'
import { useModalBackButton } from '@/hooks/useModalBackButton'
import { Button } from '@/components/ui/Button'
import { HelpIcon } from '@/components/ui/HelpIcon'
import {
  DEFAULT_PANEL_FIELDS,
  PANEL_SECTIONS,
  SECTION_BORDER_COLOR,
  SECTION_TITLE_COLOR,
} from '@/lib/settings-defaults'
import type { ServiceApplication, ApplicationStatus, NotifyLog, PanelConfig, NotificationConfig } from '@/types'

// ─── 타입 ────────────────────────────────────────────────────
interface ConnectionOption {
  id: string
  display_name: string
  manual_phone: string | null
  profiles?: { name: string; phone: string } | null
}

// ─── 기본 상수 (알림 설정 미로드 시 폴백) ─────────────────────
const FALLBACK_NOTIFY_TYPES = [
  '예약확정알림', '예약1일전알림', '예약당일알림', '서비스완료알림',
  '결제알림', '결제완료알림', '결제완료알림(잔금)', '계산서발행완료알림',
  '예약금 입금완료 알림', '예약금환급완료알림',
  '예약취소알림', 'A/S방문알림', '방문견적알림',
]

// 기본 상태 목록 (notification_config와 무관하게 항상 포함)
const BASE_STATUSES = ['신규', '견적발송', '비과세', '카드결제 완료']

const STATUS_BADGE: Record<string, string> = {
  '신규':           'bg-brand-100 text-brand-700',
  '견적발송':       'bg-indigo-100 text-indigo-700',
  '예약확정':       'bg-green-100 text-green-800',
  '예약1일전':      'bg-sky-100 text-sky-700',
  '예약당일':       'bg-blue-100 text-blue-800',
  '서비스완료':     'bg-orange-100 text-orange-700',
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

const MAP_APPS = [
  { name: '카카오맵',  getUrl: (a: string) => `https://map.kakao.com/link/search/${encodeURIComponent(a)}` },
  { name: '네이버지도', getUrl: (a: string) => `https://map.naver.com/v5/search/${encodeURIComponent(a)}` },
  { name: '티맵',     getUrl: (a: string) => `https://tmap.co.kr/search?searchRank=0&version=1&name=${encodeURIComponent(a)}` },
  { name: '구글지도',  getUrl: (a: string) => `https://maps.google.com/maps?q=${encodeURIComponent(a)}` },
]

// ─── 서브 컴포넌트 ────────────────────────────────────────────
function FieldRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
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

function copyText(text: string, setter: (v: boolean) => void) {
  if (!text.trim()) return
  try {
    navigator.clipboard?.writeText(text)
      .then(() => { setter(true); setTimeout(() => setter(false), 2000) })
      .catch(() => {})
  } catch {}
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
  spare_data: Record<string, string>
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
    spare_data:           (app.spare_data as Record<string, string>) ?? {},
  }
}

// ─── Props ───────────────────────────────────────────────────
interface Props {
  app: ServiceApplication
  onClose: () => void
  onUpdate: (updated: ServiceApplication) => void
  onDelete: (id: string) => void
  panelConfig?: PanelConfig
  notificationConfig?: NotificationConfig
}

// ─── 메인 패널 ────────────────────────────────────────────────
export function ApplicationPanel({ app, onClose, onUpdate, onDelete, panelConfig, notificationConfig }: Props) {
  useModalBackButton(true, onClose)

  const [form, setForm] = useState<FormState>(() => toForm(app))
  const [status, setStatus] = useState<string>(app.status)
  const [isFavorite, setIsFavorite] = useState(app.is_favorite)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [connections, setConnections] = useState<ConnectionOption[]>([])
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>(app.assigned_connection_ids ?? [])
  const [savingWorkers, setSavingWorkers] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [showMapMenu, setShowMapMenu] = useState(false)

  // 알림 타입 목록: notificationConfig에서 동적으로 파생 (폴더링크알림 제외)
  const activeNotifyTypes = useMemo(() => {
    const rules = notificationConfig?.rules
    if (!rules?.length) return FALLBACK_NOTIFY_TYPES
    return rules.filter(r => r.type !== '폴더링크알림').map(r => r.type)
  }, [notificationConfig])

  // 상태 목록: BASE_STATUSES + notification_config의 status_value 동적 파생
  const allStatuses = useMemo(() => {
    const fromRules = (notificationConfig?.rules ?? [])
      .filter(r => r.status_value)
      .map(r => r.status_value!)
    return Array.from(new Set([...BASE_STATUSES, ...fromRules]))
  }, [notificationConfig])

  const unfilledFields = useMemo(() => {
    const fieldKeys = [
      'business_name', 'owner_name', 'phone', 'address',
      'platform_nickname', 'email', 'business_number',
      'construction_date', 'construction_time',
      'elevator', 'parking', 'building_access', 'access_method', 'door_password',
      'care_scope', 'request_notes', 'admin_request_notes',
      'payment_method', 'account_number',
      'disposition', 'admin_notes',
    ]
    type StringFormKey = Exclude<keyof FormState, 'spare_data'>
    return fieldKeys
      .filter(key => !isHidden(key))
      .filter(key => !form[key as StringFormKey].trim())
      .map(key => resolveLabel(key))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, panelConfig])

  const [notifyType, setNotifyType] = useState(() => activeNotifyTypes[0] ?? FALLBACK_NOTIFY_TYPES[0])
  const [isSendingNotify, setIsSendingNotify] = useState(false)
  const [notifyError, setNotifyError] = useState<string | null>(null)
  const [isSendingFolderLink, setIsSendingFolderLink] = useState(false)
  const [folderLinkError, setFolderLinkError] = useState<string | null>(null)
  const [folderLinkSent, setFolderLinkSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [driveUrl, setDriveUrl] = useState<string | null>(app.drive_folder_url ?? null)
  const [isDriveLoading, setIsDriveLoading] = useState(false)
  const [driveError, setDriveError] = useState<string | null>(null)
  const [isFolderLinkCopied, setIsFolderLinkCopied] = useState(false)
  const [vatEnabled, setVatEnabled] = useState(true)
  const [notifyLogs, setNotifyLogs] = useState<NotifyLog[]>((app.notification_log as NotifyLog[]) ?? [])
  const [driveConnected, setDriveConnected] = useState(false)
  const [solapiConnected, setSolapiConnected] = useState(false)

  useEffect(() => {
    fetch('/api/business/hr/connections?status=accepted')
      .then(r => r.json())
      .then(d => { if (d.success) setConnections(d.data ?? []) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.business) {
          setDriveConnected(!!d.data.business.gmail_for_drive)
          setSolapiConnected(!!d.data.business.solapi_phone_verified)
        }
      })
      .catch(() => {})
  }, [])

  // notificationConfig 로드 후 notifyType 초기값 동기화
  useEffect(() => {
    if (activeNotifyTypes.length > 0) {
      setNotifyType(prev => activeNotifyTypes.includes(prev) ? prev : activeNotifyTypes[0])
    }
  }, [activeNotifyTypes])

  const setF = (key: keyof FormState) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }))

  const setSpare = (key: string) => (v: string) =>
    setForm((prev) => ({ ...prev, spare_data: { ...prev.spare_data, [key]: v } }))

  // ─── 결제 자동 계산 ───────────────────────────────────────
  const unitPrice = Number(form.unit_price_per_visit) || 0
  const vatAmount = vatEnabled ? Math.round(unitPrice * 0.1) : 0
  const totalAmount = unitPrice + vatAmount
  const depositAmount = Number(form.deposit) || 0
  const balanceAmount = totalAmount - depositAmount

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

  const isHidden = (key: string): boolean => {
    const override = panelConfig?.fields?.[key]?.hidden
    if (override !== undefined) return override
    return DEFAULT_PANEL_FIELDS.find((f) => f.key === key)?.defaultHidden ?? false
  }

  // 지도 메뉴 외부 클릭 닫기
  useEffect(() => {
    if (!showMapMenu) return
    const close = () => setShowMapMenu(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [showMapMenu])

  function handleOpenMap(addr: string, url: string) {
    try { navigator.clipboard?.writeText(addr) } catch {}
    window.open(url, '_blank', 'noopener,noreferrer')
    setShowMapMenu(false)
  }

  // ─── 작업자 배정 ──────────────────────────────────────────
  async function handleSaveWorkers(workerIds: string[]) {
    setSavingWorkers(true)
    try {
      const res = await fetch(`/api/business/hr/applications/${app.id}/workers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_ids: workerIds }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? '저장 실패')
    } catch {
      // silent - worker assignment is non-critical
    } finally {
      setSavingWorkers(false)
    }
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
        if (k === 'spare_data') continue
        payload[k] = numericKeys.includes(k) ? (v.trim() ? Number(v) : null) : (v.trim() || null)
      }
      payload.spare_data = form.spare_data
      payload.vat = vatAmount
      payload.supply_amount = totalAmount
      payload.balance = balanceAmount
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
      onUpdate({ ...app, drive_folder_url: json.data.folderUrl })
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
      setNotifyLogs(prev => [...prev, { type: notifyType, sent_at: new Date().toISOString(), method: 'manual' }])
      // 알림 규칙에 status_value가 있으면 상태 자동 변경
      const newStatus = json.data?.newStatus as string | undefined
      if (newStatus) {
        setStatus(newStatus)
        onUpdate({ ...app, status: newStatus })
        alert(`${notifyType} 발송 완료\n상태가 '${newStatus}'(으)로 변경되었습니다.`)
      } else {
        alert(`${notifyType} 발송 완료`)
      }
    } catch { setNotifyError('네트워크 오류') } finally { setIsSendingNotify(false) }
  }

  async function handleSendFolderLink() {
    setFolderLinkError(null)
    setIsSendingFolderLink(true)
    try {
      const res = await fetch(`/api/admin/applications/${app.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyType: '폴더링크알림' }),
      })
      const json = await res.json()
      if (!json.success) { setFolderLinkError(json.error ?? '발송 실패'); return }
      setNotifyLogs(prev => [...prev, { type: '폴더링크알림', sent_at: new Date().toISOString(), method: 'manual' }])
      setFolderLinkSent(true)
      setTimeout(() => setFolderLinkSent(false), 3000)
    } catch { setFolderLinkError('네트워크 오류') } finally { setIsSendingFolderLink(false) }
  }

  function handleCopyFolderLink() {
    if (!driveUrl) return
    navigator.clipboard.writeText(driveUrl)
      .then(() => {
        setIsFolderLinkCopied(true)
        setTimeout(() => setIsFolderLinkCopied(false), 2000)
      })
      .catch(() => {})
  }

  // ─── 섹션별 border color ──────────────────────────────────
  const sectionBorder = (sectionId: string): string => {
    const sec = PANEL_SECTIONS.find((s) => s.id === sectionId)
    return SECTION_BORDER_COLOR[sec?.color ?? 'gray'] ?? 'border-gray-200'
  }

  // panelConfig.order.sections 순서 적용 (미설정 시 기본 순서)
  const orderedSectionIds = (() => {
    const defaults = PANEL_SECTIONS.map(s => s.id as string)
    const configured = panelConfig?.order?.sections
    if (!configured?.length) return defaults
    const ordered = configured.filter(id => PANEL_SECTIONS.some(s => s.id === id))
    const remaining = defaults.filter(id => !ordered.includes(id))
    return [...ordered, ...remaining]
  })()

  const getSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'basic': return (
        <>
          {!isHidden('business_name') && (
            <FieldRow label={resolveLabel('business_name')}>
              <EditInput value={form.business_name} onChange={setF('business_name')} placeholder={resolvePlaceholder('business_name')} />
            </FieldRow>
          )}
          {!isHidden('owner_name') && (
            <FieldRow label={resolveLabel('owner_name')}>
              <EditInput value={form.owner_name} onChange={setF('owner_name')} placeholder={resolvePlaceholder('owner_name')} />
            </FieldRow>
          )}
          {!isHidden('platform_nickname') && (
            <FieldRow label={resolveLabel('platform_nickname')}>
              <EditInput value={form.platform_nickname} onChange={setF('platform_nickname')} placeholder={resolvePlaceholder('platform_nickname')} />
            </FieldRow>
          )}
          {!isHidden('phone') && (
            <FieldRow label={resolveLabel('phone')}>
              <div className="flex flex-col gap-1.5">
                <EditInput value={form.phone} onChange={setF('phone')} type="tel" placeholder={resolvePlaceholder('phone')} />
                {form.phone.trim() && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyText(form.phone, setCopiedPhone)}
                      className="flex-1 h-8 rounded-lg flex items-center justify-center gap-1 text-xs font-medium border border-border text-text-secondary hover:bg-surface-sunken active:scale-[0.98] transition-all"
                    >
                      {copiedPhone ? <Check size={11} className="text-state-success" /> : <Copy size={11} />}
                      {copiedPhone ? '복사됨' : '복사'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { window.location.href = `tel:${form.phone}` }}
                      className="flex-1 h-8 rounded-lg flex items-center justify-center gap-1 text-xs font-medium border border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100 active:scale-[0.98] transition-all"
                    >
                      <Phone size={11} />
                      전화 걸기
                    </button>
                  </div>
                )}
              </div>
            </FieldRow>
          )}
          {!isHidden('email') && (
            <FieldRow label={resolveLabel('email')}>
              <EditInput value={form.email} onChange={setF('email')} type="email" placeholder={resolvePlaceholder('email')} />
            </FieldRow>
          )}
          {!isHidden('business_number') && (
            <FieldRow label={resolveLabel('business_number')}>
              <EditInput value={form.business_number} onChange={setF('business_number')} placeholder={resolvePlaceholder('business_number')} />
            </FieldRow>
          )}
          {!isHidden('address') && (
            <FieldRow label={resolveLabel('address')}>
              <div className="flex flex-col gap-1.5">
                <EditInput value={form.address} onChange={setF('address')} placeholder={resolvePlaceholder('address')} />
                {form.address.trim() && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowMapMenu(prev => !prev)}
                      className="w-full h-8 rounded-lg flex items-center justify-center gap-1 text-xs font-medium border border-border text-text-secondary hover:bg-surface-sunken active:scale-[0.98] transition-all"
                    >
                      <MapPin size={11} />
                      지도 앱으로 열기
                      <ChevronDown size={11} className={`ml-auto mr-1 transition-transform ${showMapMenu ? 'rotate-180' : ''}`} />
                    </button>
                    {showMapMenu && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-surface rounded-xl border border-border shadow-pop overflow-hidden z-10">
                        {MAP_APPS.map(app => (
                          <button
                            key={app.name}
                            type="button"
                            onClick={() => handleOpenMap(form.address, app.getUrl(form.address))}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-sunken active:bg-surface-sunken text-sm text-text-primary transition-colors text-left"
                          >
                            <MapPin size={13} className="text-brand-500 shrink-0" />
                            <span className="font-medium">{app.name}</span>
                            <span className="ml-auto text-xs text-text-tertiary">주소 복사됨</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </FieldRow>
          )}
          {['spare_basic_1', 'spare_basic_2'].map((key) => !isHidden(key) && (
            <FieldRow key={key} label={resolveLabel(key)}>
              <EditInput value={form.spare_data[key] ?? ''} onChange={setSpare(key)} placeholder={resolvePlaceholder(key)} />
            </FieldRow>
          ))}
        </>
      )
      case 'site': return (
        <>
          {!isHidden('elevator') && (
            <FieldRow label={resolveLabel('elevator')}>
              <EditSelect value={form.elevator} onChange={setF('elevator')} options={resolveOptions('elevator')} placeholder="선택" />
            </FieldRow>
          )}
          {!isHidden('parking') && (
            <FieldRow label={resolveLabel('parking')}>
              <EditSelect value={form.parking} onChange={setF('parking')} options={resolveOptions('parking')} placeholder="선택" />
            </FieldRow>
          )}
          {!isHidden('building_access') && (
            <FieldRow label={resolveLabel('building_access')}>
              <EditSelect value={form.building_access} onChange={setF('building_access')} options={resolveOptions('building_access')} placeholder="선택" />
            </FieldRow>
          )}
          {!isHidden('access_method') && (
            <FieldRow label={resolveLabel('access_method')}>
              <EditInput value={form.access_method} onChange={setF('access_method')} placeholder={resolvePlaceholder('access_method')} />
            </FieldRow>
          )}
          {!isHidden('door_password') && (
            <FieldRow label={resolveLabel('door_password')}>
              <EditInput value={form.door_password} onChange={setF('door_password')} placeholder={resolvePlaceholder('door_password')} />
            </FieldRow>
          )}
          {['spare_site_1', 'spare_site_2'].map((key) => !isHidden(key) && (
            <FieldRow key={key} label={resolveLabel(key)}>
              <EditInput value={form.spare_data[key] ?? ''} onChange={setSpare(key)} placeholder={resolvePlaceholder(key)} />
            </FieldRow>
          ))}
        </>
      )
      case 'schedule': return (
        <>
          {!isHidden('construction_date') && (
            <FieldRow label={resolveLabel('construction_date')}>
              <EditInput value={form.construction_date} onChange={setF('construction_date')} type="date" />
            </FieldRow>
          )}
          {!isHidden('construction_time') && (
            <FieldRow label={resolveLabel('construction_time')}>
              <EditInput value={form.construction_time} onChange={setF('construction_time')} type="time" />
            </FieldRow>
          )}
          {['spare_schedule_1', 'spare_schedule_2'].map((key) => !isHidden(key) && (
            <FieldRow key={key} label={resolveLabel(key)}>
              <EditInput value={form.spare_data[key] ?? ''} onChange={setSpare(key)} placeholder={resolvePlaceholder(key)} />
            </FieldRow>
          ))}
        </>
      )
      case 'request': return (
        <>
          {!isHidden('care_scope') && (
            <FieldRow label={resolveLabel('care_scope')}>
              <EditTextarea value={form.care_scope} onChange={setF('care_scope')} placeholder={resolvePlaceholder('care_scope')} rows={2} />
            </FieldRow>
          )}
          {!isHidden('request_notes') && (
            <FieldRow label={resolveLabel('request_notes')}>
              <EditTextarea value={form.request_notes} onChange={setF('request_notes')} placeholder={resolvePlaceholder('request_notes')} rows={2} />
            </FieldRow>
          )}
          {!isHidden('admin_request_notes') && (
            <FieldRow label={resolveLabel('admin_request_notes')}>
              <EditTextarea value={form.admin_request_notes} onChange={setF('admin_request_notes')} placeholder={resolvePlaceholder('admin_request_notes')} rows={2} />
            </FieldRow>
          )}
          {['spare_request_1', 'spare_request_2'].map((key) => !isHidden(key) && (
            <FieldRow key={key} label={resolveLabel(key)}>
              <EditInput value={form.spare_data[key] ?? ''} onChange={setSpare(key)} placeholder={resolvePlaceholder(key)} />
            </FieldRow>
          ))}
        </>
      )
      case 'payment': return (
        <>
          {!isHidden('payment_method') && (
            <FieldRow label={resolveLabel('payment_method')}>
              <EditSelect value={form.payment_method} onChange={setF('payment_method')} options={resolveOptions('payment_method')} placeholder="선택" />
            </FieldRow>
          )}
          {!isHidden('account_number') && (
            <FieldRow label={resolveLabel('account_number')}>
              <div className="flex flex-col gap-1.5">
                <EditInput value={form.account_number} onChange={setF('account_number')} placeholder={resolvePlaceholder('account_number')} />
                {form.account_number.trim() && (
                  <button
                    type="button"
                    onClick={() => copyText(form.account_number, setCopiedAccount)}
                    className="w-full h-8 rounded-lg flex items-center justify-center gap-1 text-xs font-medium border border-border text-text-secondary hover:bg-surface-sunken active:scale-[0.98] transition-all"
                  >
                    {copiedAccount ? <Check size={11} className="text-state-success" /> : <Copy size={11} />}
                    {copiedAccount ? '복사됨' : '계좌번호 복사'}
                  </button>
                )}
              </div>
            </FieldRow>
          )}
          <FieldRow label="단가 (원)">
            <EditInput value={form.unit_price_per_visit} onChange={setF('unit_price_per_visit')} type="number" placeholder="0" />
          </FieldRow>
          <FieldRow label="예약금">
            <EditInput value={form.deposit} onChange={setF('deposit')} type="number" placeholder="0" />
          </FieldRow>
          <FieldRow
            label={
              <span className="flex items-center gap-1.5">
                부가세
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={vatEnabled}
                    onChange={(e) => setVatEnabled(e.target.checked)}
                    className="w-3 h-3 rounded accent-brand-600"
                  />
                  <span className="text-[10px] text-text-tertiary">10%</span>
                </label>
              </span>
            }
          >
            <span className="text-sm text-text-secondary">
              {vatAmount.toLocaleString('ko-KR')}원
            </span>
          </FieldRow>
          <FieldRow label="총액">
            <span className="text-sm font-semibold text-brand-600">
              {totalAmount.toLocaleString('ko-KR')}원
            </span>
          </FieldRow>
          <FieldRow label="잔금">
            <span className={`text-sm font-medium ${balanceAmount > 0 ? 'text-state-warning' : 'text-text-tertiary'}`}>
              {balanceAmount.toLocaleString('ko-KR')}원
            </span>
          </FieldRow>
          {['spare_payment_1', 'spare_payment_2'].map((key) => !isHidden(key) && (
            <FieldRow key={key} label={resolveLabel(key)}>
              <EditInput value={form.spare_data[key] ?? ''} onChange={setSpare(key)} placeholder={resolvePlaceholder(key)} />
            </FieldRow>
          ))}
        </>
      )
      case 'misc': return (
        <>
          {!isHidden('disposition') && (
            <FieldRow label={resolveLabel('disposition')}>
              <EditSelect value={form.disposition} onChange={setF('disposition')} options={resolveOptions('disposition')} placeholder="선택" />
            </FieldRow>
          )}
          {!isHidden('admin_notes') && (
            <FieldRow label={resolveLabel('admin_notes')}>
              <EditTextarea value={form.admin_notes} onChange={setF('admin_notes')} placeholder={resolvePlaceholder('admin_notes')} rows={3} />
            </FieldRow>
          )}
          {['spare_misc_1', 'spare_misc_2'].map((key) => !isHidden(key) && (
            <FieldRow key={key} label={resolveLabel(key)}>
              <EditInput value={form.spare_data[key] ?? ''} onChange={setSpare(key)} placeholder={resolvePlaceholder(key)} />
            </FieldRow>
          ))}
        </>
      )
      default: return null
    }
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
          {form.phone && (
            <button
              type="button"
              onClick={() => { window.location.href = `tel:${form.phone}` }}
              className="p-1 text-text-secondary hover:text-brand-600 transition-colors"
            >
              <Phone size={18} />
            </button>
          )}
        </div>

        <div className="px-4 pb-8">
          {/* 상태 변경 */}
          <SectionTitle>상태</SectionTitle>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 rounded-lg bg-surface border border-border text-sm text-text-primary px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 appearance-none"
            >
              {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              {/* 현재 상태가 목록에 없으면 추가 (기존 데이터 호환) */}
              {!allStatuses.includes(status) && (
                <option key={status} value={status}>{status}</option>
              )}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-3 text-text-tertiary pointer-events-none" />
          </div>

          {/* 일정 섹션 - 상태 바로 아래 고정 */}
          {PANEL_SECTIONS.filter(s => s.id === 'schedule').map(sec => (
            <div key="schedule">
              <SectionTitle color={sec.color}>{sec.title}</SectionTitle>
              <div className={`bg-surface rounded-2xl border-2 ${sectionBorder('schedule')} px-3 shadow-flat`}>
                {getSectionContent('schedule')}
              </div>
            </div>
          ))}

          {/* 나머지 섹션 (schedule 제외, panelConfig.order.sections 순서 적용) */}
          {orderedSectionIds.filter(id => id !== 'schedule').map(sectionId => {
            const sec = PANEL_SECTIONS.find(s => s.id === sectionId)
            if (!sec) return null
            return (
              <div key={sectionId}>
                <SectionTitle color={sec.color}>{sec.title}</SectionTitle>
                <div className={`bg-surface rounded-2xl border-2 ${sectionBorder(sectionId)} px-3 shadow-flat`}>
                  {getSectionContent(sectionId)}
                </div>
              </div>
            )
          })}

          {/* 작업자 배정 */}
          <SectionTitle color="violet">작업자 배정</SectionTitle>
          <div className="bg-violet-50 rounded-2xl border-2 border-violet-200 p-3 shadow-flat flex flex-col gap-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Users size={14} className="text-violet-500" />
              <span className="text-xs font-semibold text-violet-700">작업자 선택</span>
            </div>
            <p className="text-xs text-violet-600/70 break-keep">작업자를 지정하면 출력, 급여 목록에 자동 반영되요</p>
            <select
              value=""
              onChange={(e) => {
                const id = e.target.value
                if (!id) return
                const next = [...selectedWorkers, id]
                setSelectedWorkers(next)
                handleSaveWorkers(next)
              }}
              disabled={savingWorkers || connections.length === 0}
              className="w-full h-9 rounded-lg bg-white border border-violet-200 text-sm text-text-primary px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 disabled:opacity-50"
            >
              <option value="">
                {connections.length === 0 ? '연결된 작업자 없음' : '작업자 추가…'}
              </option>
              {connections
                .filter(c => !selectedWorkers.includes(c.id))
                .map(c => (
                  <option key={c.id} value={c.id}>{c.display_name}</option>
                ))
              }
            </select>

            {selectedWorkers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {selectedWorkers.map(id => {
                  const conn = connections.find(c => c.id === id)
                  if (!conn) return null
                  return (
                    <span key={id} className="inline-flex items-center gap-1 text-xs text-violet-700 bg-violet-100 rounded-full px-2.5 py-1 border border-violet-200">
                      {conn.display_name}
                      <button
                        type="button"
                        onClick={() => {
                          const next = selectedWorkers.filter(w => w !== id)
                          setSelectedWorkers(next)
                          handleSaveWorkers(next)
                        }}
                        disabled={savingWorkers}
                        className="text-violet-400 hover:text-state-danger transition-colors disabled:opacity-40"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  )
                })}
                {savingWorkers && <span className="text-[11px] text-violet-400">저장 중…</span>}
              </div>
            )}
          </div>

          {/* 구글 드라이브 */}
          <SectionTitle color="teal">작업 폴더 (Google Drive)</SectionTitle>
          <div className="bg-teal-50 rounded-2xl border-2 border-teal-200 p-3 shadow-flat flex flex-col gap-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <FolderOpen size={14} className="text-teal-500" />
              <span className="text-xs font-semibold text-teal-700">Google Drive</span>
              <HelpIcon
                title="작업 폴더란?"
                description={`고객별 작업 사진을 Google Drive에 자동으로 보관하는 기능입니다.\n\n📁 폴더 구조\n폴더 생성 시 아래 구조로 자동 생성됩니다.\n일잇다 > 업체명 > 고객명_날짜\n  ├ 작업전\n  └ 작업후\n\n📸 활용 방법\n① "작업 폴더 생성" 버튼으로 폴더를 만듭니다.\n② 현장에서 작업 전·후 사진을 폴더에 업로드합니다.\n③ "폴더 링크 발송" 버튼으로 고객에게 링크를 SMS로 보냅니다.\n④ 고객이 링크를 열어 작업 결과를 확인할 수 있습니다.\n\n⚙️ 사전 설정 필요\n프로필 > 설정 > 연동 메뉴에서 Google Drive 서비스 계정을 먼저 연결해야 합니다.\n\n💡 팁\n폴더 재생성 버튼을 누르면 같은 구조로 새 폴더가 만들어집니다.\n기존 폴더는 Drive에 그대로 남으니 사진이 사라지지 않습니다.`}
              />
            </div>
            {driveUrl ? (
              <>
                <div className="flex items-center gap-2">
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-teal-700 font-medium hover:underline flex-1"
                  >
                    <FolderOpen size={15} />
                    폴더 열기
                    <ExternalLink size={13} className="opacity-60" />
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyFolderLink}
                    className="p-1.5 rounded-lg bg-white hover:bg-teal-100 active:bg-teal-200 border border-teal-200 text-teal-600 transition-colors shrink-0"
                    title="링크 복사"
                  >
                    {isFolderLinkCopied ? <Check size={14} className="text-state-success" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-xs text-teal-600/70 break-keep">작업자, 고객에게 링크를 발송하고 편하게 관리하세요</p>
                <Button size="sm" variant="ghost" onClick={handleCreateDriveFolder} isLoading={isDriveLoading} fullWidth>
                  폴더 재생성
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-teal-600/70">각 고객 폴더(작업전/후)가 생성되며, 알림으로 링크를 쉽게 발송할 수 있습니다.</p>
                {driveConnected ? (
                  <button
                    type="button"
                    onClick={handleCreateDriveFolder}
                    disabled={isDriveLoading}
                    className="w-full h-9 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isDriveLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FolderOpen size={14} />
                    )}
                    작업 폴더 생성
                  </button>
                ) : (
                  <p className="text-xs text-teal-600/70 break-keep">
                    Google Drive 연동이 필요해요.{' '}
                    <a href="/business/profile/settings/integrations" className="underline font-medium">연동 설정하기 →</a>
                  </p>
                )}
              </>
            )}
            {driveError && <p className="text-xs text-state-danger">{driveError}</p>}
          </div>

          {/* 알림 발송 */}
          <SectionTitle color="amber">알림 발송 (SMS)</SectionTitle>
          <div className="bg-amber-50 rounded-2xl border-2 border-amber-200 p-3 shadow-flat flex flex-col gap-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Megaphone size={14} className="text-amber-500" />
              <span className="text-xs font-semibold text-amber-700">SMS 알림</span>
            </div>
            <select
              value={notifyType}
              onChange={(e) => setNotifyType(e.target.value)}
              className="w-full h-10 rounded-lg bg-white border border-amber-200 text-sm text-text-primary px-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            >
              {activeNotifyTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <p className="text-xs text-amber-700/70 break-keep">
              <a href="/business/profile/settings/notifications" className="underline font-medium">알림 목록 수정 →</a>
            </p>
            {solapiConnected ? (
              <button
                type="button"
                onClick={handleNotify}
                disabled={isSendingNotify}
                className="w-full h-9 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSendingNotify ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Megaphone size={14} />
                )}
                {form.phone || '연락처 없음'}으로 발송
              </button>
            ) : (
              <p className="text-xs text-amber-700/70 break-keep">
                발신번호 등록이 필요해요.{' '}
                <a href="/business/profile/settings/integrations" className="underline font-medium">연동 설정하기 →</a>
              </p>
            )}
            {notifyError && <p className="text-xs text-state-danger">{notifyError}</p>}

            {/* 폴더 링크 보내기 */}
            {driveUrl && (
              <div className="border-t border-amber-200 pt-2 flex flex-col gap-1.5">
                <p className="text-xs text-amber-700/70 break-keep">고객 연락처로 링크가 발송되요. 발송문구 변경(설정 &gt; 서비스알림설정)</p>
                <button
                  type="button"
                  onClick={handleSendFolderLink}
                  disabled={isSendingFolderLink}
                  className="w-full h-9 rounded-lg bg-white hover:bg-amber-100 active:bg-amber-200 text-amber-700 border border-amber-300 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSendingFolderLink ? (
                    <span className="inline-block w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                  ) : (
                    <FolderOpen size={14} />
                  )}
                  {folderLinkSent ? '발송 완료!' : `${form.phone || '연락처 없음'}으로 폴더 링크 발송`}
                </button>
                {folderLinkError && <p className="text-xs text-state-danger">{folderLinkError}</p>}
              </div>
            )}
          </div>

          {/* 미작성 항목 */}
          {unfilledFields.length > 0 && (
            <>
              <SectionTitle>미작성 항목</SectionTitle>
              <div className="rounded-2xl border-2 border-state-warning/40 bg-state-warning-bg p-3 shadow-flat">
                <p className="text-xs text-text-secondary mb-2 break-keep">아래 항목이 아직 작성되지 않았습니다</p>
                <div className="flex flex-wrap gap-1.5">
                  {unfilledFields.map(label => (
                    <span key={label} className="inline-flex items-center gap-1 text-xs font-medium text-state-warning bg-surface border border-state-warning/30 rounded-full px-2.5 py-1">
                      <span className="w-1 h-1 rounded-full bg-state-warning inline-block shrink-0" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

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
