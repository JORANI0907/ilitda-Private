'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Star, Search, Phone, MapPin, CalendarDays, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card } from '@/components/ui/Card'
import { ApplicationPanel } from '@/components/admin/ApplicationPanel'
import { useRouter } from 'next/navigation'
import type { ServiceApplication, ApplicationStatus } from '@/types'

// ─── 상수 ────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; bg: string }> = {
  '신규':          { label: '신규',          bg: 'bg-brand-100 text-brand-700' },
  '견적발송':      { label: '견적발송',       bg: 'bg-indigo-100 text-indigo-700' },
  '예약확정':      { label: '예약확정',       bg: 'bg-green-100 text-green-800' },
  '예약1일전':     { label: '예약1일전',      bg: 'bg-sky-100 text-sky-700' },
  '예약당일':      { label: '예약당일',       bg: 'bg-blue-100 text-blue-800' },
  '작업완료':      { label: '작업완료',       bg: 'bg-orange-100 text-orange-700' },
  '결제':          { label: '결제',           bg: 'bg-amber-100 text-amber-700' },
  '결제완료':      { label: '결제완료',       bg: 'bg-gray-100 text-gray-600' },
  '결제완료(잔금)': { label: '결제완료(잔금)', bg: 'bg-emerald-100 text-emerald-700' },
  '계산서발행완료': { label: '계산서발행',     bg: 'bg-gray-100 text-gray-500' },
  '비과세':        { label: '비과세',         bg: 'bg-gray-100 text-gray-500' },
  '카드결제 완료': { label: '카드결제완료',    bg: 'bg-gray-100 text-gray-500' },
  '예약금환급완료': { label: '예약금환급',     bg: 'bg-gray-100 text-gray-500' },
  '예약금 입금':   { label: '예약금입금',      bg: 'bg-teal-100 text-teal-700' },
  '예약취소':      { label: '예약취소',       bg: 'bg-red-100 text-red-600' },
  'A/S방문':       { label: 'A/S방문',        bg: 'bg-yellow-100 text-yellow-700' },
  '방문견적':      { label: '방문견적',       bg: 'bg-purple-100 text-purple-700' },
}

type FilterKey = 'all' | 'favorite' | ApplicationStatus
const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all',      label: '전체' },
  { key: 'favorite', label: '⭐ 즐겨찾기' },
  { key: '신규',     label: '신규' },
  { key: '견적발송', label: '견적발송' },
  { key: '예약확정', label: '예약확정' },
  { key: '예약1일전', label: '예약1일전' },
  { key: '예약당일', label: '예약당일' },
  { key: '작업완료', label: '작업완료' },
  { key: '결제',     label: '결제' },
  { key: '결제완료', label: '결제완료' },
]

// ─── 카드 ────────────────────────────────────────────────────
function AppCard({
  app,
  onClick,
  onFavoriteToggle,
}: {
  app: ServiceApplication
  onClick: () => void
  onFavoriteToggle: (id: string, val: boolean) => void
}) {
  const badge = STATUS_BADGE[app.status]

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

  const totalAmt = (app.deposit ?? 0) + (app.supply_amount ?? 0) + (app.vat ?? 0)

  return (
    <Card
      padding="md"
      className="cursor-pointer active:scale-[0.98] transition-transform hover:shadow-card"
      onClick={onClick}
    >
      <div className="flex flex-col gap-2">
        {/* 상단: 상태배지 + 즐겨찾기 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {badge && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.bg}`}>
                {badge.label}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={toggleFav}
            className="shrink-0 p-1 text-text-tertiary hover:text-amber-400 transition-colors"
          >
            <Star size={15} className={app.is_favorite ? 'fill-amber-400 text-amber-400' : ''} />
          </button>
        </div>

        {/* 업체명 */}
        <p className="font-semibold text-text-primary leading-tight">{app.business_name || '(업체명 미입력)'}</p>

        {/* 서브 정보 */}
        <div className="flex flex-col gap-1 text-sm text-text-secondary">
          {app.owner_name && (
            <span className="flex items-center gap-1.5">
              <Phone size={12} className="shrink-0 text-text-tertiary" />
              {app.owner_name}{app.phone ? ` · ${app.phone}` : ''}
            </span>
          )}
          {app.address && (
            <span className="flex items-start gap-1.5">
              <MapPin size={12} className="shrink-0 text-text-tertiary mt-0.5" />
              <span className="line-clamp-1 break-keep">{app.address}</span>
            </span>
          )}
          {app.construction_date && (
            <span className="flex items-center gap-1.5">
              <CalendarDays size={12} className="shrink-0 text-text-tertiary" />
              시공일: {app.construction_date}{app.construction_time ? ` ${app.construction_time}` : ''}
            </span>
          )}
        </div>

        {/* 금액 */}
        {totalAmt > 0 && (
          <p className="text-sm font-medium text-brand-600">
            {totalAmt.toLocaleString('ko-KR')}원
          </p>
        )}
      </div>
    </Card>
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
  const [apps, setApps] = useState<ServiceApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fetchApps = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (activeFilter === 'favorite') params.set('favorite', '1')
      else if (activeFilter !== 'all') params.set('status', activeFilter)

      const res = await fetch(`/api/admin/applications?${params.toString()}`)
      const json = await res.json()
      if (!json.success) { setError(json.error ?? '불러오기 실패'); return }
      setApps(json.data ?? [])
    } catch { setError('네트워크 오류') } finally { setIsLoading(false) }
  }, [query, activeFilter])

  useEffect(() => {
    const t = setTimeout(fetchApps, 300)
    return () => clearTimeout(t)
  }, [fetchApps])

  const selected = apps.find((a) => a.id === selectedId) ?? null

  function handleUpdate(updated: ServiceApplication) {
    setApps((prev) => prev.map((a) => a.id === updated.id ? updated : a))
    setSelectedId(null)
  }

  function handleDelete(id: string) {
    setApps((prev) => prev.filter((a) => a.id !== id))
    setSelectedId(null)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">서비스관리</h1>
          <p className="text-sm text-text-tertiary mt-0.5">{apps.length}건</p>
        </div>
        <Button size="sm" onClick={() => router.push('/admin/applications/new')}>
          <Plus size={15} />
          추가
        </Button>
      </div>

      {/* 검색 */}
      <Input
        placeholder="업체명·담당자명·전화번호 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leadingIcon={<Search size={15} />}
      />

      {/* 필터 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
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

      {/* 목록 */}
      <div className="flex flex-col gap-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-state-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchApps}>재시도</Button>
          </div>
        )}

        {!isLoading && !error && apps.length === 0 && (
          <EmptyState
            icon={<ClipboardList size={40} />}
            title="등록된 서비스 신청이 없어요"
            description="+ 추가 버튼을 눌러 첫 서비스를 등록해 보세요."
            bordered
          />
        )}

        {!isLoading && !error && apps.map((app) => (
          <AppCard
            key={app.id}
            app={app}
            onClick={() => setSelectedId(app.id)}
            onFavoriteToggle={(id, val) =>
              setApps((prev) => prev.map((a) => a.id === id ? { ...a, is_favorite: val } : a))
            }
          />
        ))}
      </div>

      {/* 상세 패널 */}
      {selected && (
        <ApplicationPanel
          app={selected}
          onClose={() => setSelectedId(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
