'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Users, LogIn, ChevronLeft, ChevronRight, Calendar, Search } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'
import type { Connection } from '@/types'

type WorkerTab = string // connection id

interface ApplicationItem {
  id: string
  construction_date: string | null
  business_name: string
  care_scope: string | null
  worker_pay: Record<string, number> | null
  assigned_connection_ids: string[] | null
  workers: { connection_id: string; display_name: string }[]
}

interface SaveStatus {
  [key: string]: 'idle' | 'saving' | 'saved' | 'error'
}

function formatDate(d: string | null): string {
  if (!d) return '날짜 미정'
  const date = new Date(d)
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

function formatAmount(n: number | null | undefined): string {
  if (n === null || n === undefined) return ''
  return n.toLocaleString('ko-KR')
}

const HELP_SECTIONS = [
  {
    title: '급여 입력 방법',
    content: '① 상단 탭에서 급여를 입력할 직원 이름을 선택합니다.\n② 해당 직원이 배정된 현장 목록이 표시됩니다.\n③ 각 현장 행의 입력란에 급여 금액을 숫자로 입력합니다.\n④ 입력 후 화면의 다른 곳을 탭하면 자동으로 저장됩니다.\n   "저장됨" 문구가 나타나면 완료입니다.\n\n전체 탭에서는 모든 직원의 현장을 한 번에 볼 수 있습니다.',
  },
  {
    title: '급여 입력 및 저장 방법',
    content: '각 작업자 행의 입력란에 급여를 입력한 뒤 다른 곳을 탭하면 자동으로 저장됩니다. "저장됨" 문구가 나타나면 저장이 완료된 것입니다.',
  },
  {
    title: '엑셀 내보내기 활용',
    content: '오른쪽 상단의 "엑셀" 버튼을 누르면 전체 급여 데이터를 .xlsx 파일로 내려받습니다.\n\n활용 예시)\n• 세무사에게 급여 자료 제출 시\n• 급여 명세서 발급 시\n• 월별 인건비 정리 시\n\n파일에는 작업일자, 업체명, 작업자, 급여, 계좌번호, 사업자번호 등이 포함됩니다.',
  },
  {
    title: '엑셀 내보내기 방법',
    content: '오른쪽 상단의 "엑셀" 버튼을 누르면 전체 급여 데이터를 엑셀 파일로 내려받을 수 있습니다. 계좌번호, 사업자번호 등 정산에 필요한 정보가 함께 포함됩니다.',
  },
  {
    title: '총 급여 계산 방식',
    content: '상단의 합계 표시는 현재 선택한 탭(전체 또는 특정 작업자)에 해당하는 모든 현장 급여의 합산 금액입니다.',
  },
  {
    title: '주의사항',
    content: '• 4대보험(국민연금·건강보험·고용보험·산재보험)과 소득세 공제는 앱에서 자동으로 처리하지 않습니다.\n  세무사 또는 담당자와 별도로 확인하여 처리하세요.\n\n• 급여 입력 후 반드시 저장 여부를 "저장됨" 표시로 확인하세요.\n  저장되지 않으면 페이지를 벗어날 때 입력 내용이 사라집니다.',
  },
]

export default function PayrollPage() {
  const router = useRouter()
  const [helpOpen, setHelpOpen] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [connections, setConnections] = useState<Connection[]>([])
  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeWorker, setActiveWorker] = useState<WorkerTab>('all')
  const [saveStatuses, setSaveStatuses] = useState<SaveStatus>({})
  const [inputValues, setInputValues] = useState<Record<string, string>>({})

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [isCustomRange, setIsCustomRange] = useState(false)
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  function prevMonth() {
    setIsCustomRange(false)
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    setIsCustomRange(false)
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1) }
    else setViewMonth((m) => m + 1)
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [connRes, payRes] = await Promise.all([
        fetch('/api/business/hr/connections?status=accepted'),
        fetch('/api/business/hr/payroll'),
      ])
      const connJson = await connRes.json()
      const payJson = await payRes.json()

      if (connJson.success) {
        setConnections(connJson.data ?? [])
      }
      if (!payJson.success) {
        setError(payJson.error ?? '데이터를 불러오지 못했습니다.')
        return
      }
      setIsDemo(payJson.isDemo === true)
      const apps: ApplicationItem[] = payJson.data ?? []
      setApplications(apps)

      // Initialize input values from existing worker_pay
      const initValues: Record<string, string> = {}
      for (const app of apps) {
        for (const w of app.workers ?? []) {
          const key = `${app.id}__${w.connection_id}`
          const existing = app.worker_pay?.[w.connection_id]
          initValues[key] = existing !== undefined ? String(existing) : ''
        }
      }
      setInputValues(initValues)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleBlur = async (applicationId: string, connectionId: string) => {
    const key = `${applicationId}__${connectionId}`
    const rawVal = inputValues[key] ?? ''
    const amount = rawVal === '' ? null : Number(rawVal.replace(/,/g, ''))

    if (isNaN(amount ?? 0) && amount !== null) return

    setSaveStatuses((prev) => ({ ...prev, [key]: 'saving' }))
    try {
      const res = await fetch('/api/business/hr/payroll', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId, connection_id: connectionId, amount }),
      })
      const json = await res.json()
      if (!json.success) {
        setSaveStatuses((prev) => ({ ...prev, [key]: 'error' }))
        return
      }
      setSaveStatuses((prev) => ({ ...prev, [key]: 'saved' }))
      // Update local state
      setApplications((prev) => prev.map((a) => {
        if (a.id !== applicationId) return a
        const updatedPay = { ...(a.worker_pay ?? {}) }
        if (amount === null) {
          delete updatedPay[connectionId]
        } else {
          updatedPay[connectionId] = amount
        }
        return { ...a, worker_pay: updatedPay }
      }))
      setTimeout(() => {
        setSaveStatuses((prev) => ({ ...prev, [key]: 'idle' }))
      }, 1500)
    } catch {
      setSaveStatuses((prev) => ({ ...prev, [key]: 'error' }))
    }
  }

  const monthPrefix = `${viewYear}-${String(viewMonth).padStart(2, '0')}`
  const filteredApps = applications.filter((app) => {
    const date = app.construction_date ?? ''
    const matchesFilter = isCustomRange && rangeStart && rangeEnd
      ? date >= rangeStart && date <= rangeEnd
      : date.startsWith(monthPrefix)
    if (activeWorker === 'all') return matchesFilter
    return matchesFilter && (app.assigned_connection_ids ?? []).includes(activeWorker)
  })

  const q = searchQuery.trim().toLowerCase()
  const searchedApps = q
    ? filteredApps.filter(app =>
        app.business_name.toLowerCase().includes(q) ||
        (app.workers ?? []).some(w => w.display_name.toLowerCase().includes(q))
      )
    : filteredApps

  const totalForWorker = searchedApps.reduce((sum, app) => {
    if (activeWorker === 'all') {
      return sum + Object.values(app.worker_pay ?? {}).reduce((s, v) => s + v, 0)
    }
    return sum + (app.worker_pay?.[activeWorker] ?? 0)
  }, 0)

  const handleExport = async () => {
    const xlsx = await import('xlsx')

    // Build rows: one row per (application, worker) pair — current month only
    const rows: Record<string, string | number>[] = []
    for (const app of searchedApps) {
      for (const w of app.workers ?? []) {
        const conn = connections.find((c) => c.id === w.connection_id)
        rows.push({
          작업일자: app.construction_date ?? '',
          업체명: app.business_name,
          케어범위: app.care_scope ?? '',
          작업자: w.display_name,
          급여: app.worker_pay?.[w.connection_id] ?? '',
          계좌번호: conn?.manual_account_number ?? '',
          은행: conn?.manual_account_bank ?? '',
          사업자번호: conn?.manual_registration_number ?? '',
          주민등록번호: conn?.manual_resident_number ?? '',
        })
      }
    }

    if (rows.length === 0) {
      rows.push({ 작업일자: '데이터 없음', 업체명: '', 케어범위: '', 작업자: '', 급여: '', 계좌번호: '', 은행: '', 사업자번호: '', 주민등록번호: '' })
    }

    const ws = xlsx.utils.json_to_sheet(rows)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, '급여명세')
    const filename = isCustomRange && rangeStart && rangeEnd
      ? `급여명세_${rangeStart}~${rangeEnd}.xlsx`
      : `급여명세_${viewYear}${String(viewMonth).padStart(2, '0')}.xlsx`
    xlsx.writeFile(wb, filename)
  }

  const workerTabs = [
    { id: 'all', label: '전체' },
    ...connections.map((c) => ({ id: c.id, label: c.display_name })),
  ]

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-24">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <SectionHeader title="급여 관리" level="page" />
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

      <HelpBanner label="급여 관리 사용법 보기" onClick={() => setHelpOpen(true)} />
      <HelpTip variant="warning">금액 입력 후 다른 곳을 탭하면 자동 저장됩니다. "저장됨" 표시가 나타나야 반영된 것입니다.</HelpTip>
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="급여 관리 사용법"
        sections={HELP_SECTIONS}
      />

      {/* 월 네비게이션 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center bg-surface-sunken rounded-2xl px-2 py-1.5 gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-text-secondary hover:bg-surface hover:text-text-primary transition-colors shrink-0"
            aria-label="이전 달"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="flex-1 text-center text-sm font-semibold text-text-primary">
            {isCustomRange && rangeStart && rangeEnd
              ? `${rangeStart} ~ ${rangeEnd}`
              : `${viewYear}년 ${viewMonth}월`}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-text-secondary hover:bg-surface hover:text-text-primary transition-colors shrink-0"
            aria-label="다음 달"
          >
            <ChevronRight size={18} />
          </button>
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
            직접설정
          </button>
        </div>
        {/* CSS 아코디언 */}
        <div className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isCustomRange ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}>
          <div className="pt-0.5 flex flex-col gap-2">
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
            <div className="bg-surface-sunken rounded-2xl px-4 py-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="업체명, 작업자 검색"
                  className="w-full h-9 rounded-xl border border-border bg-surface pl-8 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 작업자 탭 */}
      <div className="flex items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
          {workerTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveWorker(tab.id)}
              className={`
                shrink-0 h-8 px-4 rounded-full text-sm font-medium transition-colors
                ${activeWorker === tab.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-sunken text-text-secondary hover:bg-border'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleExport}
          title="엑셀 다운로드"
          className="h-9 w-9 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-sunken hover:text-text-primary transition-colors shrink-0"
        >
          <Download size={18} />
        </button>
      </div>

      {/* 합계 카드 */}
      {!isLoading && searchedApps.length > 0 && (
        <div className="rounded-2xl bg-surface border-2 border-brand-500 px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-text-secondary">
            {activeWorker === 'all'
              ? `급여합계(${searchedApps.length}건)`
              : `${connections.find((c) => c.id === activeWorker)?.display_name ?? ''} 급여합계(${searchedApps.length}건)`}
            {q && (
              <span className="ml-1.5 text-xs text-text-tertiary font-normal">&ldquo;{searchQuery}&rdquo;</span>
            )}
          </span>
          <span className="text-base font-bold text-brand-600 tracking-tight shrink-0">
            {totalForWorker.toLocaleString('ko-KR')}원
          </span>
        </div>
      )}

      {error && (
        <p className="text-sm text-state-danger text-center">{error}</p>
      )}

      {isLoading && Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 bg-surface rounded-2xl animate-pulse border border-border-subtle" />
      ))}

      {!isLoading && !error && searchedApps.length === 0 && (
        <EmptyState
          icon={<Users size={40} />}
          title={
            q ? `"${searchQuery}"에 해당하는 결과가 없어요`
              : isCustomRange && rangeStart && rangeEnd ? '선택한 기간에 급여 데이터가 없어요'
              : `${viewMonth}월 급여 데이터가 없어요`
          }
          description="검색어를 바꾸거나 다른 기간을 확인해 보세요."
          bordered
        />
      )}

      {!isLoading && !error && searchedApps.length > 0 && (
        <div className="flex flex-col gap-3">
          {searchedApps.map((app) => {
            const workersToShow = activeWorker === 'all'
              ? (app.workers ?? [])
              : (app.workers ?? []).filter((w) => w.connection_id === activeWorker)

            return (
              <div
                key={app.id}
                className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-4 flex flex-col gap-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-text-primary text-sm">{app.business_name}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-text-tertiary">{formatDate(app.construction_date)}</span>
                    {app.care_scope && (
                      <span className="text-xs text-text-tertiary">{app.care_scope}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {workersToShow.map((w) => {
                    const key = `${app.id}__${w.connection_id}`
                    const status = saveStatuses[key] ?? 'idle'
                    return (
                      <div key={w.connection_id} className="flex items-center gap-3">
                        <span className="text-sm text-text-secondary shrink-0 w-20 break-keep">{w.display_name}</span>
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            placeholder="급여 입력"
                            value={inputValues[key] ?? ''}
                            onChange={(e) => setInputValues((prev) => ({ ...prev, [key]: e.target.value }))}
                            onBlur={() => handleBlur(app.id, w.connection_id)}
                            className="w-full h-10 rounded-md border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                          />
                          {status !== 'idle' && (
                            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${
                              status === 'saving' ? 'text-text-tertiary' :
                              status === 'saved' ? 'text-state-success' : 'text-state-danger'
                            }`}>
                              {status === 'saving' ? '저장중' : status === 'saved' ? '저장됨' : '오류'}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-text-tertiary shrink-0">원</span>
                        {app.worker_pay?.[w.connection_id] !== undefined && (
                          <span className="text-xs text-text-secondary shrink-0">
                            {formatAmount(app.worker_pay[w.connection_id])}원
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
