'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download, CheckSquare, Square, LogIn, Calendar, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'

// ─── 타입 ────────────────────────────────────────────────────
interface MonthlySchedule {
  id: string
  service_date: string
  service_type: string | null
  fee: number | null
  status: string
  client: {
    name: string
    owner_name: string | null
    business_number: string | null
    payment_method: string | null
  } | null
}

interface PaymentBreakdown {
  method: string
  amount: number
  percent: number
}

interface MonthlyData {
  total: number
  byPaymentMethod: PaymentBreakdown[]
  schedules: MonthlySchedule[]
}

interface AnnualData {
  year: number
  total: number
  months: { month: number; total: number }[]
}

// ─── 상수 ────────────────────────────────────────────────────
const METHOD_COLORS: Record<string, string> = {
  '현금(세금계산서)': '#6366f1',
  '카드결제':         '#3b82f6',
  '현금(비과세X)':   '#22c55e',
}
const DEFAULT_COLOR = '#94a3b8'

const STATUS_LABEL: Record<string, string> = {
  scheduled:   '예정',
  in_progress: '진행중',
  completed:   '완료',
}

function getMethodColor(method: string) {
  return METHOD_COLORS[method] ?? DEFAULT_COLOR
}

function fmtKr(n: number) {
  return n.toLocaleString('ko-KR')
}

function fmtDate(d: string) {
  const [, m, day] = d.split('-')
  return `${Number(m)}월 ${Number(day)}일`
}

// ─── 도넛 차트 ───────────────────────────────────────────────
function DonutChart({ segments }: { segments: { value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const cx = 80, cy = 80, r = 62, ir = 42

  if (total === 0) {
    return (
      <svg width={160} height={160} viewBox="0 0 160 160">
        <circle cx={cx} cy={cy} r={(r + ir) / 2} fill="none" stroke="#e2e8f0" strokeWidth={r - ir} />
      </svg>
    )
  }

  if (segments.length === 1) {
    return (
      <svg width={160} height={160} viewBox="0 0 160 160">
        <circle cx={cx} cy={cy} r={(r + ir) / 2} fill="none" stroke={segments[0].color} strokeWidth={r - ir} />
      </svg>
    )
  }

  let angle = -Math.PI / 2
  const paths: { d: string; color: string }[] = []

  for (const seg of segments) {
    const sweep = (seg.value / total) * 2 * Math.PI
    const endAngle = angle + sweep
    const large = sweep > Math.PI ? 1 : 0

    const x1 = cx + r  * Math.cos(angle),    y1 = cy + r  * Math.sin(angle)
    const x2 = cx + r  * Math.cos(endAngle),  y2 = cy + r  * Math.sin(endAngle)
    const ix1= cx + ir * Math.cos(endAngle),  iy1= cy + ir * Math.sin(endAngle)
    const ix2= cx + ir * Math.cos(angle),     iy2= cy + ir * Math.sin(angle)

    paths.push({
      color: seg.color,
      d: `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${ix1} ${iy1} A${ir} ${ir} 0 ${large} 0 ${ix2} ${iy2} Z`,
    })
    angle = endAngle
  }

  return (
    <svg width={160} height={160} viewBox="0 0 160 160">
      {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} />)}
    </svg>
  )
}

// ─── 페이지 ──────────────────────────────────────────────────
type ViewMode = 'monthly' | 'annual'

export default function RevenuePage() {
  const router = useRouter()
  const now = new Date()

  const [view, setView]             = useState<ViewMode>('monthly')
  const [year, setYear]             = useState(now.getFullYear())
  const [month, setMonth]           = useState(now.getMonth() + 1)
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null)
  const [annualData, setAnnualData]   = useState<AnnualData | null>(null)
  const [isLoading, setIsLoading]   = useState(false)
  const [isDemo, setIsDemo]         = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [isCustomRange, setIsCustomRange] = useState(false)
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd]     = useState('')
  const [selectedMethods, setSelectedMethods] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  const fetchMonthly = useCallback(async (y: number, m: number) => {
    setIsLoading(true)
    setSelectedIds(new Set())
    setSelectedMethods(new Set())
    setSearchQuery('')
    try {
      const res = await fetch(`/api/business/revenue?year=${y}&month=${m}`)
      const json = await res.json()
      if (json.success) { setMonthlyData(json.data); setIsDemo(json.isDemo === true) }
    } catch { /* ignore */ }
    finally { setIsLoading(false) }
  }, [])

  const fetchRange = useCallback(async (from: string, to: string) => {
    setIsLoading(true)
    setSelectedIds(new Set())
    setSelectedMethods(new Set())
    setSearchQuery('')
    try {
      const res = await fetch(`/api/business/revenue?from=${from}&to=${to}`)
      const json = await res.json()
      if (json.success) { setMonthlyData(json.data); setIsDemo(json.isDemo === true) }
    } catch { /* ignore */ }
    finally { setIsLoading(false) }
  }, [])

  const fetchAnnual = useCallback(async (y: number) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/business/revenue?year=${y}`)
      const json = await res.json()
      if (json.success) { setAnnualData(json.data); setIsDemo(json.isDemo === true) }
    } catch { /* ignore */ }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => {
    if (view === 'monthly') {
      if (isCustomRange && rangeStart && rangeEnd) fetchRange(rangeStart, rangeEnd)
      else if (!isCustomRange) fetchMonthly(year, month)
      // isCustomRange=true지만 날짜 미입력 상태 → 재조회 없이 현재 데이터 유지
    } else {
      fetchAnnual(year)
    }
  }, [view, year, month, isCustomRange, rangeStart, rangeEnd, fetchMonthly, fetchRange, fetchAnnual])

  function prevPeriod() {
    setIsCustomRange(false)
    if (view === 'monthly') {
      if (month === 1) { setYear(y => y - 1); setMonth(12) }
      else setMonth(m => m - 1)
    } else {
      setYear(y => y - 1)
    }
  }

  function nextPeriod() {
    setIsCustomRange(false)
    if (view === 'monthly') {
      if (month === 12) { setYear(y => y + 1); setMonth(1) }
      else setMonth(m => m + 1)
    } else {
      setYear(y => y + 1)
    }
  }

  const schedules = monthlyData?.schedules ?? []

  const availableMethods = useMemo(() => {
    const methods = new Set<string>()
    schedules.forEach(s => { if (s.client?.payment_method) methods.add(s.client.payment_method) })
    return Array.from(methods).sort()
  }, [schedules])

  const displaySchedules = useMemo(() =>
    selectedMethods.size > 0
      ? schedules.filter(s => selectedMethods.has(s.client?.payment_method ?? ''))
      : schedules
  , [schedules, selectedMethods])

  const rq = searchQuery.trim().toLowerCase()
  const searchedSchedules = useMemo(() =>
    rq
      ? displaySchedules.filter(s =>
          (s.client?.name ?? '').toLowerCase().includes(rq) ||
          (s.client?.owner_name ?? '').toLowerCase().includes(rq) ||
          (s.service_type ?? '').toLowerCase().includes(rq)
        )
      : displaySchedules
  , [displaySchedules, rq])

  const allSelected = searchedSchedules.length > 0 && searchedSchedules.every(s => selectedIds.has(s.id))

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(searchedSchedules.map(s => s.id)))
  }

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleExport() {
    if (selectedIds.size === 0) return
    setIsExporting(true)
    try {
      const res = await fetch('/api/business/revenue/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleIds: Array.from(selectedIds) }),
      })
      if (!res.ok) throw new Error('실패')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      const suffix = isCustomRange && rangeStart && rangeEnd
        ? `${rangeStart}_${rangeEnd}`
        : `${year}${String(month).padStart(2, '0')}`
      a.download = `세금계산서_${suffix}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('다운로드에 실패했습니다.')
    } finally {
      setIsExporting(false)
    }
  }

  const periodLabel = isCustomRange && rangeStart && rangeEnd
    ? `${rangeStart} ~ ${rangeEnd}`
    : view === 'monthly' ? `${year}년 ${month}월` : `${year}년`
  const dayLabel = isCustomRange && rangeStart && rangeEnd
    ? `${rangeStart}~${rangeEnd}`
    : view === 'monthly' ? `${month}월` : `${year}년`

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-8">

      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <SectionHeader title="매출 관리" level="page" />
      </div>

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

      {/* 월간 / 연간 토글 */}
      <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 self-start">
        {(['monthly', 'annual'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === v
                ? 'bg-white text-text-primary shadow-soft'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {v === 'monthly' ? '월간' : '연간'}
          </button>
        ))}
      </div>

      {/* 기간 네비게이션 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center bg-surface-sunken rounded-2xl px-2 py-1.5 gap-1">
          <button
            onClick={prevPeriod}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-text-secondary hover:bg-surface hover:text-text-primary transition-colors shrink-0"
            aria-label="이전"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="flex-1 text-center text-sm font-semibold text-text-primary">
            {periodLabel}
          </span>
          <button
            onClick={nextPeriod}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-text-secondary hover:bg-surface hover:text-text-primary transition-colors shrink-0"
            aria-label="다음"
          >
            <ChevronRight size={18} />
          </button>
          {view === 'monthly' && (
            <>
              <div className="w-px h-4 bg-border shrink-0" />
              <button
                type="button"
                onClick={() => setIsCustomRange((v) => !v)}
                className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors shrink-0 ${
                  isCustomRange
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                <Calendar size={12} />
                세부검색
              </button>
            </>
          )}
        </div>
        {/* CSS 아코디언 - DOM 유지하여 레이아웃 shift 방지 */}
        <div className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isCustomRange && view === 'monthly' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}>
          <div className="flex flex-col gap-2 pt-0.5">
            {/* 날짜 직접 설정 */}
            <div className="flex items-center gap-2 bg-surface-sunken rounded-2xl px-4 py-3">
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="flex-1 h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
              <span className="text-text-tertiary text-sm shrink-0">~</span>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="flex-1 h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
            {/* 결제방법 필터 */}
            <div className="flex flex-wrap items-center gap-2 bg-surface-sunken rounded-2xl px-4 py-3">
              <span className="text-xs text-text-tertiary shrink-0">결제방법</span>
              <button
                type="button"
                onClick={() => setSelectedMethods(new Set())}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedMethods.size === 0
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-surface text-text-secondary border-border hover:border-brand-300 hover:text-brand-600'
                }`}
              >
                전체
              </button>
              {availableMethods.map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setSelectedMethods(prev => {
                    const next = new Set(prev)
                    if (next.has(method)) next.delete(method)
                    else next.add(method)
                    return next
                  })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedMethods.has(method)
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-surface text-text-secondary border-border hover:border-brand-300 hover:text-brand-600'
                  }`}
                >
                  {method}
                </button>
              ))}
              {availableMethods.length === 0 && (
                <span className="text-xs text-text-tertiary">이 기간 데이터 조회 후 표시됩니다</span>
              )}
            </div>
            {/* 검색 */}
            <div className="bg-surface-sunken rounded-2xl px-4 py-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="업체명, 담당자, 서비스 유형 검색"
                  className="w-full h-9 rounded-xl border border-border bg-surface pl-8 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 로딩 스켈레톤 */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="md">
              <div className="h-14 bg-surface-sunken rounded animate-pulse" />
            </Card>
          ))}
        </div>
      )}

      {/* ── 월간 뷰 ───────────────────────────────────────── */}
      {!isLoading && view === 'monthly' && monthlyData && (
        <>
          {/* 총액 카드 */}
          <div className="rounded-2xl bg-surface border-2 border-brand-500 px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-text-secondary">
              {periodLabel} 총 매출액({searchedSchedules.length}건)
              {(selectedMethods.size > 0 || rq) && searchedSchedules.length !== schedules.length
                ? ` · 전체 ${schedules.length}건` : ''}
            </span>
            <span className="text-base font-bold text-brand-600 tracking-tight shrink-0">
              ₩{fmtKr(monthlyData.total)}
            </span>
          </div>

          {/* 결제방법 도넛 차트 */}
          {monthlyData.byPaymentMethod.length > 0 && (
            <Card padding="md">
              <p className="text-sm font-semibold text-text-primary mb-3">결제방법별 현황</p>
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  <DonutChart
                    segments={monthlyData.byPaymentMethod.map(bp => ({
                      value: bp.amount,
                      color: getMethodColor(bp.method),
                    }))}
                  />
                </div>
                <div className="flex flex-col gap-2.5 min-w-0">
                  {monthlyData.byPaymentMethod.map((bp) => (
                    <div key={bp.method} className="flex items-start gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0"
                        style={{ backgroundColor: getMethodColor(bp.method) }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-text-primary leading-tight truncate">
                          {bp.method}
                        </p>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          {bp.percent}% · ₩{fmtKr(bp.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* 목록 컨트롤 */}
          <div className="flex items-center justify-between">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-sm text-text-secondary active:opacity-70"
            >
              {allSelected
                ? <CheckSquare size={18} className="text-brand-600" />
                : <Square size={18} />
              }
              전체선택
            </button>
            {selectedIds.size > 0 && (
              <Button size="sm" variant="secondary" onClick={handleExport} disabled={isExporting}>
                <Download size={14} />
                {isExporting ? '다운로드 중...' : `엑셀 (${selectedIds.size}건)`}
              </Button>
            )}
          </div>

          {/* 일정 목록 */}
          {searchedSchedules.length === 0 ? (
            <EmptyState title={
              rq ? `"${searchQuery}"에 해당하는 결과가 없어요.`
                : selectedMethods.size > 0 ? '선택한 결제방법의 매출이 없어요.'
                : `${dayLabel} 매출 내역이 없어요.`
            } />
          ) : (
            <div className="flex flex-col gap-2">
              {searchedSchedules.map((s) => (
                <div
                  key={s.id}
                  onClick={() => toggleOne(s.id)}
                  className="flex items-center gap-3 bg-surface border border-border-subtle rounded-2xl px-4 py-3 cursor-pointer hover:border-brand-200 hover:bg-brand-50/30 active:scale-[0.98] transition-all"
                >
                  {selectedIds.has(s.id)
                    ? <CheckSquare size={18} className="text-brand-600 shrink-0" />
                    : <Square size={18} className="text-text-tertiary shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-xs text-text-tertiary">{fmtDate(s.service_date)}</span>
                      <span className="text-sm font-semibold text-text-primary truncate">
                        {s.client?.name ?? '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {s.service_type && (
                        <span className="text-xs text-text-tertiary">{s.service_type}</span>
                      )}
                      {s.client?.payment_method && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white"
                          style={{ backgroundColor: getMethodColor(s.client.payment_method) }}
                        >
                          {s.client.payment_method}
                        </span>
                      )}
                      <span className="text-xs text-text-tertiary">
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-text-primary shrink-0">
                    {s.fee != null ? `₩${fmtKr(s.fee)}` : '-'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── 연간 뷰 ───────────────────────────────────────── */}
      {!isLoading && view === 'annual' && annualData && (
        <>
          {/* 연간 총액 */}
          <div className="rounded-2xl bg-surface border-2 border-brand-500 px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-text-secondary">
              {year}년 연간 총 매출액
            </span>
            <span className="text-base font-bold text-brand-600 tracking-tight shrink-0">
              ₩{fmtKr(annualData.total)}
            </span>
          </div>

          {/* 월별 바 차트 */}
          <Card padding="md">
            {(() => {
              const maxVal = Math.max(...annualData.months.map(m => m.total), 1)
              return (
                <div className="flex flex-col gap-3">
                  {annualData.months.map((m) => (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-xs text-text-tertiary w-5 shrink-0 text-right">
                        {m.month}월
                      </span>
                      <div className="flex-1 bg-surface-sunken rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-brand-600 rounded-full transition-all duration-300"
                          style={{ width: `${(m.total / maxVal) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-text-primary w-24 text-right shrink-0">
                        {m.total > 0 ? `₩${fmtKr(m.total)}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </Card>
        </>
      )}
    </div>
  )
}
