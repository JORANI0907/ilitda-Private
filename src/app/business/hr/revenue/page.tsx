'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Download, CheckSquare, Square, TrendingUp } from 'lucide-react'
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)

  const fetchMonthly = useCallback(async (y: number, m: number) => {
    setIsLoading(true)
    setSelectedIds(new Set())
    try {
      const res = await fetch(`/api/business/revenue?year=${y}&month=${m}`)
      const json = await res.json()
      if (json.success) setMonthlyData(json.data)
    } catch { /* ignore */ }
    finally { setIsLoading(false) }
  }, [])

  const fetchAnnual = useCallback(async (y: number) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/business/revenue?year=${y}`)
      const json = await res.json()
      if (json.success) setAnnualData(json.data)
    } catch { /* ignore */ }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => {
    if (view === 'monthly') fetchMonthly(year, month)
    else fetchAnnual(year)
  }, [view, year, month, fetchMonthly, fetchAnnual])

  function prevPeriod() {
    if (view === 'monthly') {
      if (month === 1) { setYear(y => y - 1); setMonth(12) }
      else setMonth(m => m - 1)
    } else {
      setYear(y => y - 1)
    }
  }

  function nextPeriod() {
    if (view === 'monthly') {
      if (month === 12) { setYear(y => y + 1); setMonth(1) }
      else setMonth(m => m + 1)
    } else {
      setYear(y => y + 1)
    }
  }

  const schedules = monthlyData?.schedules ?? []
  const allSelected = schedules.length > 0 && schedules.every(s => selectedIds.has(s.id))

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(schedules.map(s => s.id)))
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
      a.download = `세금계산서_${year}${String(month).padStart(2, '0')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('다운로드에 실패했습니다.')
    } finally {
      setIsExporting(false)
    }
  }

  const periodLabel = view === 'monthly' ? `${year}년 ${month}월` : `${year}년`
  const dayLabel    = view === 'monthly' ? `${month}월` : `${year}년`

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
      <div className="flex items-center justify-between">
        <button
          onClick={prevPeriod}
          className="p-2 rounded-lg hover:bg-surface-sunken transition-colors"
        >
          <ChevronLeft size={20} className="text-text-secondary" />
        </button>
        <p className="text-base font-bold text-text-primary">{periodLabel}</p>
        <button
          onClick={nextPeriod}
          className="p-2 rounded-lg hover:bg-surface-sunken transition-colors"
        >
          <ChevronRight size={20} className="text-text-secondary" />
        </button>
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
          <div className="rounded-2xl bg-brand-600 px-5 py-4 flex items-center gap-4">
            <TrendingUp size={32} className="text-brand-300 shrink-0" />
            <div>
              <p className="text-xs text-brand-200">{periodLabel} 총 매출액</p>
              <p className="text-2xl font-bold text-white mt-0.5">
                ₩ {fmtKr(monthlyData.total)}
              </p>
              <p className="text-xs text-brand-300 mt-0.5">{schedules.length}건</p>
            </div>
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
          {schedules.length === 0 ? (
            <EmptyState title={`${dayLabel} 매출 내역이 없어요.`} />
          ) : (
            <div className="flex flex-col gap-2">
              {schedules.map((s) => (
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
          <div className="rounded-2xl bg-brand-600 px-5 py-4 flex items-center gap-4">
            <TrendingUp size={32} className="text-brand-300 shrink-0" />
            <div>
              <p className="text-xs text-brand-200">{year}년 연간 총 매출액</p>
              <p className="text-2xl font-bold text-white mt-0.5">
                ₩ {fmtKr(annualData.total)}
              </p>
            </div>
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
