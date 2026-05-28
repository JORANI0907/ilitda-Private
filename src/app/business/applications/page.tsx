'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react'
import { useModalBackButton } from '@/hooks/useModalBackButton'
import {
  Plus, Star, Search, Phone, MapPin, CalendarDays, ClipboardList,
  ChevronLeft, ChevronRight, ArrowUp, ArrowDown, LayoutList, LogIn,
  Trash2, Check,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { ApplicationPanel } from '@/components/admin/ApplicationPanel'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import { useRouter } from 'next/navigation'
import type { ServiceApplication, ApplicationStatus, PanelConfig, NotificationConfig } from '@/types'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'
import { getFeatureLimit, toPlanType } from '@/lib/plan-features'
import { usePlanType } from '@/hooks/usePlanType'
import { usePlanFeatures } from '@/contexts/PlanFeaturesContext'
import { AuthContext } from '@/contexts/AuthContext'

// ─── 상태 뱃지 ───────────────────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; bg: string }> = {
  '신규':           { label: '신규',           bg: 'bg-brand-light text-brand-700' },
  '견적발송':       { label: '견적발송',        bg: 'bg-indigo-100 text-indigo-700' },
  '예약확정':       { label: '예약확정',        bg: 'bg-green-100 text-green-800' },
  '예약1일전':      { label: '예약1일전',       bg: 'bg-sky-100 text-sky-700' },
  '예약당일':       { label: '예약당일',        bg: 'bg-blue-100 text-blue-800' },
  '서비스완료':     { label: '서비스완료',       bg: 'bg-orange-100 text-orange-700' },
  '결제':           { label: '결제',            bg: 'bg-amber-100 text-amber-700' },
  '결제완료':       { label: '결제완료',        bg: 'bg-state-success-bg text-state-success' },
  '결제완료(잔금)': { label: '결제완료(잔금)',  bg: 'bg-emerald-100 text-emerald-700' },
  '계산서발행완료': { label: '계산서발행',      bg: 'bg-surface-sunken text-text-tertiary' },
  '비과세':         { label: '비과세',          bg: 'bg-surface-sunken text-text-tertiary' },
  '카드결제 완료':  { label: '카드결제완료',    bg: 'bg-surface-sunken text-text-tertiary' },
  '예약금환급완료': { label: '예약금환급',      bg: 'bg-surface-sunken text-text-tertiary' },
  '예약금 입금':    { label: '예약금입금',      bg: 'bg-teal-100 text-teal-700' },
  '예약취소':       { label: '예약취소',        bg: 'bg-state-danger-bg text-state-danger' },
  'A/S방문':        { label: 'A/S방문',         bg: 'bg-yellow-100 text-yellow-700' },
  '방문견적':       { label: '방문견적',        bg: 'bg-purple-100 text-purple-700' },
}

// 캘린더 날짜 셀 점 색상
const STATUS_DOT: Record<string, string> = {
  '신규':     'bg-brand-500',
  '예약확정': 'bg-green-500',
  '예약1일전':'bg-sky-500',
  '예약당일': 'bg-blue-500',
  '서비스완료': 'bg-orange-500',
  '결제':     'bg-amber-500',
  '결제완료': 'bg-emerald-500',
  '예약취소': 'bg-red-500',
}

// ─── 필터 탭 ─────────────────────────────────────────────────
type FilterKey = 'all' | ApplicationStatus
const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all',      label: '전체' },
  { key: '신규',     label: '신규' },
  { key: '예약당일', label: '예약당일' },
  { key: '서비스완료', label: '서비스완료' },
  { key: '결제완료', label: '결제완료' },
]

const TODAY = new Date().toISOString().slice(0, 10)

// ─── 캘린더 그리드 ─────────────────────────────────────────────
function CalendarGrid({
  year, month, applications, onDaySelect,
}: {
  year: number
  month: number  // 1-based
  applications: ServiceApplication[]
  onDaySelect: (dateStr: string, apps: ServiceApplication[]) => void
}) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const dayMap = useMemo(() => {
    const map: Record<string, ServiceApplication[]> = {}
    for (const app of applications) {
      if (!app.construction_date) continue
      const d = app.construction_date.slice(0, 10)
      if (!map[d]) map[d] = []
      map[d].push(app)
    }
    return map
  }, [applications])

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const DAYS = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border-subtle">
        {DAYS.map(d => (
          <div key={d} className={`text-center py-2.5 text-xs font-semibold
            ${d === '일' ? 'text-red-500' : d === '토' ? 'text-brand-600' : 'text-text-secondary'}`}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[5rem]">
        {cells.map((day, i) => {
          if (!day) return (
            <div key={`e-${i}`} className="border-r border-b border-border-subtle bg-surface-sunken/40" />
          )
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const apps = dayMap[dateStr] ?? []
          const isToday = dateStr === TODAY
          const dow = (firstDay + day - 1) % 7
          const hasApps = apps.length > 0

          return (
            <div
              key={day}
              onClick={() => hasApps && onDaySelect(dateStr, apps)}
              className={`border-r border-b border-border-subtle p-1.5 flex flex-col gap-0.5
                ${isToday ? 'bg-brand-50' : (dow === 0 || dow === 6) ? 'bg-surface-sunken/30' : ''}
                ${hasApps ? 'cursor-pointer hover:bg-brand-50/60 transition-colors' : ''}`}
            >
              <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0
                ${isToday ? 'bg-brand-600 text-white' : dow === 0 ? 'text-red-500' : dow === 6 ? 'text-brand-600' : 'text-text-primary'}`}>
                {day}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {apps.slice(0, 3).map(app => (
                  <div key={app.id} className="px-1 py-0.5 rounded bg-surface border border-border-subtle">
                    <div className="flex items-center gap-0.5 min-w-0">
                      <span className={`w-1 h-1 rounded-full shrink-0 ${STATUS_DOT[app.status] ?? 'bg-text-tertiary'}`} />
                      <span className="text-[9px] text-text-primary font-medium truncate leading-tight">
                        {[app.business_name, app.owner_name, app.care_scope].filter(Boolean).join(' ') || '미입력'}
                      </span>
                    </div>
                  </div>
                ))}
                {apps.length > 3 && (
                  <div className="text-[10px] text-text-tertiary px-1">+{apps.length - 3}건</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 날짜 목록 패널 ─────────────────────────────────────────────
function DayListPanel({
  dateStr, apps, onSelectApp, onClose, allDates, onDateChange,
}: {
  dateStr: string
  apps: ServiceApplication[]
  onSelectApp: (app: ServiceApplication) => void
  onClose: () => void
  allDates: string[]
  onDateChange: (date: string) => void
}) {
  useModalBackButton(true, onClose)

  const touchStartX = useRef<number | null>(null)
  const parts = dateStr.split('-').map(Number)
  const m = parts[1]
  const d = parts[2]
  const dow = new Date(dateStr + 'T12:00:00').getDay()
  const dayLabel = ['일', '월', '화', '수', '목', '금', '토'][dow]

  const currentIdx = allDates.indexOf(dateStr)
  const hasPrev = currentIdx > 0
  const hasNext = currentIdx < allDates.length - 1

  const goTo = (delta: number) => {
    const newIdx = currentIdx + delta
    if (newIdx >= 0 && newIdx < allDates.length) onDateChange(allDates[newIdx])
  }

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 40) goTo(delta > 0 ? 1 : -1)
    touchStartX.current = null
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="bg-surface w-full max-w-md rounded-2xl flex flex-col overflow-hidden max-h-[75vh] shadow-modal"
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
          <button
            type="button"
            onClick={() => goTo(-1)}
            disabled={!hasPrev}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xl leading-none
              ${hasPrev ? 'text-text-secondary hover:bg-surface-sunken' : 'text-text-tertiary cursor-not-allowed'}`}
          >
            ‹
          </button>
          <div className="text-center">
            <h3 className="font-bold text-text-primary">{m}월 {d}일 ({dayLabel})</h3>
            <p className="text-xs text-text-tertiary">{apps.length}건</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goTo(1)}
              disabled={!hasNext}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xl leading-none
                ${hasNext ? 'text-text-secondary hover:bg-surface-sunken' : 'text-text-tertiary cursor-not-allowed'}`}
            >
              ›
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-text-tertiary hover:text-text-secondary"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-3 flex flex-col gap-2 pb-6">
          {apps.length === 0 ? (
            <p className="text-center text-sm text-text-tertiary py-8">이 날짜에 일정이 없습니다.</p>
          ) : apps.map(app => {
            const badge = STATUS_BADGE[app.status]
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => { onSelectApp(app); onClose() }}
                className="text-left bg-surface-sunken hover:bg-brand-50 border border-border-subtle hover:border-brand-200 rounded-xl p-3 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[app.status] ?? 'bg-text-tertiary'}`} />
                  <span className="font-semibold text-text-primary text-sm">{app.business_name || '(업체명 미입력)'}</span>
                  {badge && (
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full shrink-0 ${badge.bg}`}>{badge.label}</span>
                  )}
                </div>
                {app.owner_name && <p className="text-xs text-text-secondary ml-4">{app.owner_name}</p>}
                {app.address && <p className="text-[11px] text-text-tertiary truncate ml-4 mt-0.5">{app.address}</p>}
                {app.construction_time && <p className="text-[11px] text-brand-500 ml-4 mt-0.5">{app.construction_time}</p>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── 카드 ────────────────────────────────────────────────────
function AppCard({
  app,
  onClick,
  onFavoriteToggle,
  isSelected,
  onSelect,
}: {
  app: ServiceApplication
  onClick: () => void
  onFavoriteToggle: (id: string, val: boolean) => void
  isSelected?: boolean
  onSelect?: (id: string) => void
}) {
  const badge = STATUS_BADGE[app.status]
  const isToday = app.construction_date === TODAY

  async function toggleFav(e: React.MouseEvent) {
    e.stopPropagation()
    const next = !app.is_favorite
    onFavoriteToggle(app.id, next)
    await fetch(`/api/admin/applications/${app.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: next }),
    })
  }

  const totalAmt = app.supply_amount ?? 0

  return (
    <div className="relative">
      {/* 체크박스: 항상 표시, 클릭 시 카드 열기 동작과 분리 */}
      <button
        type="button"
        className="absolute top-1/2 -translate-y-1/2 left-3 z-10 p-1"
        onClick={(e) => { e.stopPropagation(); onSelect?.(app.id) }}
      >
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
          ${isSelected ? 'bg-brand-600 border-brand-600' : 'bg-surface border-border'}`}>
          {isSelected && <Check size={12} className="text-white" />}
        </div>
      </button>
      <Card
        padding="sm"
        className={`cursor-pointer active:scale-[0.98] transition-transform hover:shadow-card
          ${isToday ? 'border-l-4 border-l-brand-600' : ''}
          ${isSelected ? 'ring-2 ring-brand-500 ring-inset bg-brand-50' : ''}`}
        onClick={onClick}
      >
        <div className="pl-7 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            {/* 뱃지 + 업체명 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {isToday && (
                <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-brand-600 text-white">오늘</span>
              )}
              {badge && (
                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${badge.bg}`}>{badge.label}</span>
              )}
              <span className="font-semibold text-text-primary text-sm truncate">
                {app.business_name || '(업체명 미입력)'}
              </span>
            </div>
            {/* 담당자 · 연락처 · 시공일 */}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {app.owner_name && (
                <span className="text-xs text-text-secondary">
                  {app.owner_name}{app.phone ? ` · ${app.phone}` : ''}
                </span>
              )}
              {app.construction_date && (
                <span className="flex items-center gap-0.5 text-xs text-text-tertiary">
                  <CalendarDays size={10} className="shrink-0" />
                  {app.construction_date}{app.construction_time ? ` ${app.construction_time}` : ''}
                </span>
              )}
            </div>
          </div>
          {/* 금액 + 즐겨찾기 */}
          <div className="shrink-0 flex flex-col items-end gap-0.5">
            {totalAmt > 0 && (
              <span className="text-xs font-semibold text-brand-600">{totalAmt.toLocaleString('ko-KR')}원</span>
            )}
            <button
              type="button"
              onClick={toggleFav}
              className="p-0.5 text-text-tertiary hover:text-amber-400 transition-colors"
            >
              <Star size={14} className={app.is_favorite ? 'fill-amber-400 text-amber-400' : ''} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function CardSkeleton() {
  return (
    <Card padding="md">
      <div className="flex flex-col gap-2">
        <div className="h-5 w-16 bg-surface-sunken rounded-full animate-pulse" />
        <div className="h-5 w-40 bg-surface-sunken rounded animate-pulse" />
        <div className="h-4 w-28 bg-surface-sunken rounded animate-pulse" />
        <div className="h-4 w-36 bg-surface-sunken rounded animate-pulse" />
      </div>
    </Card>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function ApplicationsPage() {
  const router = useRouter()
  const auth = useContext(AuthContext)
  const isGuest = !auth?.isLoading && !auth?.user
  const { planType } = usePlanType()
  const { features: planFeatures } = usePlanFeatures()
  const [appLimitUpgradeOpen, setAppLimitUpgradeOpen] = useState(false)

  const [apps, setApps] = useState<ServiceApplication[]>([])
  const [isDemo, setIsDemo] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelConfig, setPanelConfig] = useState<PanelConfig | undefined>(undefined)
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig | undefined>(undefined)
  const [helpOpen, setHelpOpen] = useState(false)

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [sortAsc, setSortAsc] = useState(true)

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [yearMonthPickerOpen, setYearMonthPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(now.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDateApps, setSelectedDateApps] = useState<ServiceApplication[]>([])

  useModalBackButton(yearMonthPickerOpen, () => setYearMonthPickerOpen(false))

  function prevMonth() {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1) }
    else setViewMonth((m) => m + 1)
  }

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const [panelRes, notifRes] = await Promise.all([
          fetch('/api/admin/settings/panel'),
          fetch('/api/admin/settings/notifications'),
        ])
        const [panelJson, notifJson] = await Promise.all([panelRes.json(), notifRes.json()])
        if (panelJson.success && panelJson.data) setPanelConfig(panelJson.data as PanelConfig)
        if (notifJson.success && notifJson.data?.rules) {
          setNotificationConfig({ rules: notifJson.data.rules })
        }
      } catch { /* 기본값으로 동작 */ }
    }
    loadConfigs()
  }, [])

  const fetchApps = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      const res = await fetch(`/api/admin/applications?${params.toString()}`)
      const json = await res.json()
      if (!json.success) { setError(json.error ?? '불러오기 실패'); return }
      setApps(json.data ?? [])
      setIsDemo(json.isDemo === true)
    } catch { setError('네트워크 오류') } finally { setIsLoading(false) }
  }, [query])

  useEffect(() => {
    const t = setTimeout(fetchApps, 300)
    return () => clearTimeout(t)
  }, [fetchApps])

  const appLimit = isGuest
    ? Infinity
    : getFeatureLimit(toPlanType(planType), 'application_limit', planFeatures ?? undefined)

  const displayedApps = useMemo(() => {
    const monthPrefix = `${viewYear}-${String(viewMonth).padStart(2, '0')}`
    const filtered = apps.filter((a) => {
      if (!a.construction_date?.startsWith(monthPrefix)) return false
      if (activeFilter !== 'all' && a.status !== activeFilter) return false
      return true
    })
    const sorted = [...filtered].sort((a, b) => {
      const da = a.construction_date ?? ''
      const db = b.construction_date ?? ''
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      const cmp = da.localeCompare(db)
      return sortAsc ? cmp : -cmp
    })
    return appLimit === Infinity ? sorted : sorted.slice(0, appLimit)
  }, [apps, activeFilter, viewYear, viewMonth, sortAsc, appLimit])

  const allDates = useMemo(() => {
    const dateSet = new Set<string>()
    for (const app of displayedApps) {
      if (app.construction_date) dateSet.add(app.construction_date.slice(0, 10))
    }
    return Array.from(dateSet).sort()
  }, [displayedApps])

  const selected = apps.find((a) => a.id === selectedId) ?? null

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const results = await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/admin/applications/${id}`, { method: 'DELETE' })
        )
      )
      if (results.some(r => !r.ok)) {
        setDeleteError('일부 항목 삭제에 실패했습니다. 다시 시도해주세요.')
        return
      }
      setApps(prev => prev.filter(a => !selectedIds.has(a.id)))
      setSelectedIds(new Set())
      setShowDeleteModal(false)
    } catch {
      setDeleteError('삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  function handleUpdate(updated: ServiceApplication) {
    setApps((prev) => prev.map((a) => a.id === updated.id ? updated : a))
  }

  function handleDelete(id: string) {
    setApps((prev) => prev.filter((a) => a.id !== id))
    setSelectedId(null)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      {/* 도움말 배너 */}
      <HelpBanner label="서비스 관리 사용법 보기" onClick={() => setHelpOpen(true)} />
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="서비스 관리 사용법"
        sections={[
          {
            title: '목록뷰 / 캘린더뷰 전환',
            content: '오른쪽 상단의 목록(리스트) 아이콘과 캘린더 아이콘을 탭해 뷰를 전환할 수 있습니다.\n• 목록뷰: 서비스 카드를 한 줄씩 확인\n• 캘린더뷰: 월별 달력에서 날짜별 서비스 확인\n캘린더에서 날짜를 탭하면 해당 날짜 서비스 목록이 팝업으로 표시됩니다.',
          },
          {
            title: '상태 탭 의미',
            content: '• 전체: 모든 서비스를 표시합니다.\n• 신규: 접수 후 아직 확정되지 않은 서비스입니다.\n• 예약당일: 오늘 방문 예정인 서비스입니다.\n• 서비스완료: 작업이 완료된 서비스입니다.\n• 결제완료: 결제까지 모두 마무리된 서비스입니다.',
          },
          {
            title: '필터 및 정렬',
            content: '• 년/월 이동: 왼쪽/오른쪽 화살표 버튼으로 이전·다음 달로 이동합니다.\n• 년/월 직접 선택: 가운데 "년 월" 버튼을 탭하면 연도·월 선택 팝업이 열립니다.\n• 정렬: 오른쪽 위 화살표 버튼으로 날짜 오름차순/내림차순을 전환합니다.',
          },
          {
            title: '신청서 상세 보기',
            content: '목록의 카드를 탭하면 오른쪽에서 상세 패널이 열립니다.\n패널에서 상태 변경, 결제 정보 입력, 담당자 메모 등을 수정할 수 있습니다.',
          },
        ]}
      />

      {/* 데모 배너 */}
      {isDemo && (
        <div className="flex items-center justify-between gap-3 bg-brand-50 border border-brand-200 rounded-2xl px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-700">데모 모드로 둘러보는 중이에요</p>
            <p className="text-xs text-brand-600 mt-0.5 break-keep">가입하면 나만의 사업장을 관리할 수 있어요.</p>
          </div>
          <Link href="/login/register" className="flex-shrink-0 flex items-center gap-1.5 bg-brand-600 text-white text-xs font-semibold px-3 h-9 rounded-lg hover:bg-brand-700 transition-colors">
            <LogIn size={14} /> 가입하기
          </Link>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">서비스관리</h1>
          <p className="text-sm text-text-tertiary mt-0.5">
            {selectedIds.size > 0 ? `${selectedIds.size}개 선택됨` : `${displayedApps.length}건`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="h-9 px-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              취소
            </button>
          )}
          <Button size="sm" onClick={() => router.push('/business/applications/new')}>
            <Plus size={15} />
            추가
          </Button>
        </div>
      </div>

      {/* 검색 */}
      <div className="flex flex-col gap-1.5">
        <Input
          placeholder="업체명·담당자명·전화번호 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leadingIcon={<Search size={15} />}
        />
        <HelpTip>업체명, 주소, 담당자명으로 검색할 수 있습니다.</HelpTip>
      </div>

      {/* 년/월 네비게이션 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-sunken text-text-secondary hover:bg-border transition-colors shrink-0"
          aria-label="이전 달"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex-1 text-center relative">
          <button
            type="button"
            onClick={() => { setPickerYear(viewYear); setYearMonthPickerOpen(v => !v) }}
            className="text-base font-bold text-text-primary hover:text-brand-600 transition-colors px-2 py-1 rounded-lg"
          >
            {viewYear}년 {viewMonth}월
          </button>

          {yearMonthPickerOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setYearMonthPickerOpen(false)}
              />
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-surface border border-border rounded-2xl shadow-pop p-4 w-64"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => setPickerYear(y => y - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-sunken text-text-secondary text-lg"
                  >
                    ‹
                  </button>
                  <span className="font-bold text-text-primary">{pickerYear}년</span>
                  <button
                    type="button"
                    onClick={() => setPickerYear(y => y + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-sunken text-text-secondary text-lg"
                  >
                    ›
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setViewYear(pickerYear)
                        setViewMonth(m)
                        setYearMonthPickerOpen(false)
                      }}
                      className={`py-2 text-sm rounded-lg font-medium transition-colors
                        ${m === viewMonth && pickerYear === viewYear
                          ? 'bg-brand-600 text-white'
                          : 'hover:bg-surface-sunken text-text-secondary'
                        }`}
                    >
                      {m}월
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-sunken text-text-secondary hover:bg-border transition-colors shrink-0"
          aria-label="다음 달"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 필터 탭 + 뷰 토글 + 정렬 */}
      <div className="flex items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-1 min-w-0">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={`
                shrink-0 h-8 px-3 rounded-full text-sm font-medium transition-colors
                ${activeFilter === tab.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-sunken text-text-secondary hover:bg-border'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 목록/캘린더 토글 */}
        <div className="shrink-0 flex bg-surface-sunken rounded-xl p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`h-7 px-2 flex items-center justify-center rounded-lg transition-all
              ${viewMode === 'list' ? 'bg-surface text-text-primary shadow-flat' : 'text-text-tertiary hover:text-text-secondary'}`}
            aria-label="목록 보기"
          >
            <LayoutList size={14} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`h-7 px-2 flex items-center justify-center rounded-lg transition-all
              ${viewMode === 'calendar' ? 'bg-surface text-text-primary shadow-flat' : 'text-text-tertiary hover:text-text-secondary'}`}
            aria-label="캘린더 보기"
          >
            <CalendarDays size={14} />
          </button>
        </div>

        {/* 정렬 버튼 */}
        <button
          type="button"
          onClick={() => setSortAsc((v) => !v)}
          className="shrink-0 h-8 w-8 flex items-center justify-center rounded-xl bg-surface-sunken text-text-secondary hover:bg-border transition-colors"
          aria-label={sortAsc ? '오름차순' : '내림차순'}
        >
          {sortAsc
            ? <ArrowUp size={14} className="text-brand-600" />
            : <ArrowDown size={14} className="text-brand-600" />}
        </button>
      </div>

      {/* 목록 뷰 */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-3">
          {isLoading && Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}

          {!isLoading && error && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm text-state-danger">{error}</p>
              <Button variant="secondary" size="sm" onClick={fetchApps}>재시도</Button>
            </div>
          )}

          {!isLoading && !error && displayedApps.length === 0 && (
            <EmptyState
              icon={<ClipboardList size={40} />}
              title={`${viewYear}년 ${viewMonth}월 시공 일정이 없어요`}
              description="다른 달로 이동하거나 새 서비스를 추가해 보세요."
              bordered
            />
          )}

          {!isLoading && !error && displayedApps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onClick={() => setSelectedId(app.id)}
              onFavoriteToggle={(id, val) =>
                setApps((prev) => prev.map((a) => a.id === id ? { ...a, is_favorite: val } : a))
              }
              isSelected={selectedIds.has(app.id)}
              onSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {/* 캘린더 뷰 */}
      {viewMode === 'calendar' && (
        <div>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <CalendarGrid
              year={viewYear}
              month={viewMonth}
              applications={displayedApps}
              onDaySelect={(dateStr, dayApps) => {
                setSelectedDate(dateStr)
                setSelectedDateApps(dayApps)
              }}
            />
          )}
        </div>
      )}

      {/* 신청서 한도 초과 배너 */}
      {!isGuest && appLimit !== Infinity && apps.length > appLimit && (
        <Card padding="md" className="border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800 break-keep">
                신청서 한도({appLimit}건)에 도달했습니다
              </p>
              <p className="text-xs text-amber-700 mt-0.5 break-keep">
                플랜을 업그레이드하면 더 많은 신청서를 관리할 수 있어요.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              className="shrink-0"
              onClick={() => setAppLimitUpgradeOpen(true)}
            >
              업그레이드
            </Button>
          </div>
        </Card>
      )}

      {/* 상세 패널 */}
      {selected && (
        <ApplicationPanel
          app={selected}
          onClose={() => setSelectedId(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          panelConfig={panelConfig}
          notificationConfig={notificationConfig}
        />
      )}

      {/* 날짜 목록 패널 */}
      {selectedDate && (
        <DayListPanel
          dateStr={selectedDate}
          apps={selectedDateApps}
          onSelectApp={(app) => setSelectedId(app.id)}
          onClose={() => setSelectedDate(null)}
          allDates={allDates}
          onDateChange={(newDate) => {
            setSelectedDate(newDate)
            setSelectedDateApps(displayedApps.filter(a => a.construction_date?.slice(0, 10) === newDate))
          }}
        />
      )}

      {/* 선택 삭제 플로팅 바 */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-surface border border-border shadow-pop rounded-2xl px-4 py-3 whitespace-nowrap">
          <span className="text-sm font-medium text-text-secondary">{selectedIds.size}개 선택됨</span>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 h-9 px-4 bg-state-danger text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            <Trash2 size={14} />
            삭제
          </button>
        </div>
      )}

      {/* 신청서 한도 업그레이드 모달 */}
      <UpgradeModal
        open={appLimitUpgradeOpen}
        onClose={() => setAppLimitUpgradeOpen(false)}
        featureName="신청서 목록 한도 확장"
        requiredPlan="basic"
        currentPlan={toPlanType(planType)}
      />

      {/* 삭제 확인 모달 */}
      <Modal
        open={showDeleteModal}
        onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setDeleteError(null) } }}
        title="서비스 삭제"
      >
        <div className="flex flex-col gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-state-danger">⚠️ 삭제된 데이터는 복구할 수 없습니다</p>
            <p className="text-xs text-state-danger/80 mt-1 break-keep">
              선택한 서비스 {selectedIds.size}건이 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
          </div>
          {deleteError && (
            <p className="text-sm text-state-danger text-center">{deleteError}</p>
          )}
          <div className="flex flex-col gap-2">
            <Button variant="danger" fullWidth onClick={handleBulkDelete} isLoading={isDeleting}>
              {selectedIds.size}건 영구 삭제
            </Button>
            <Button variant="ghost" fullWidth onClick={() => { setShowDeleteModal(false); setDeleteError(null) }} disabled={isDeleting}>
              취소
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
