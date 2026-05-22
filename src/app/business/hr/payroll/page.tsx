'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, Users } from 'lucide-react'
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
    title: '급여 입력 및 저장 방법',
    content: '각 작업자 행의 입력란에 급여를 입력한 뒤 다른 곳을 탭하면 자동으로 저장됩니다. "저장됨" 문구가 나타나면 저장이 완료된 것입니다.',
  },
  {
    title: '엑셀 내보내기 방법',
    content: '오른쪽 상단의 "엑셀" 버튼을 누르면 전체 급여 데이터를 엑셀 파일로 내려받을 수 있습니다. 계좌번호, 사업자번호 등 정산에 필요한 정보가 함께 포함됩니다.',
  },
  {
    title: '총 급여 계산 방식',
    content: '상단의 합계 표시는 현재 선택한 탭(전체 또는 특정 작업자)에 해당하는 모든 현장 급여의 합산 금액입니다.',
  },
]

export default function PayrollPage() {
  const [helpOpen, setHelpOpen] = useState(false)
  const [connections, setConnections] = useState<Connection[]>([])
  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeWorker, setActiveWorker] = useState<WorkerTab>('all')
  const [saveStatuses, setSaveStatuses] = useState<SaveStatus>({})
  const [inputValues, setInputValues] = useState<Record<string, string>>({})

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

  const filteredApps = applications.filter((app) => {
    if (activeWorker === 'all') return true
    return (app.assigned_connection_ids ?? []).includes(activeWorker)
  })

  const totalForWorker = filteredApps.reduce((sum, app) => {
    if (activeWorker === 'all') {
      return sum + Object.values(app.worker_pay ?? {}).reduce((s, v) => s + v, 0)
    }
    return sum + (app.worker_pay?.[activeWorker] ?? 0)
  }, 0)

  const handleExport = async () => {
    const xlsx = await import('xlsx')

    // Build rows: one row per (application, worker) pair
    const rows: Record<string, string | number>[] = []
    for (const app of applications) {
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
    xlsx.writeFile(wb, `급여명세_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const workerTabs = [
    { id: 'all', label: '전체' },
    ...connections.map((c) => ({ id: c.id, label: c.display_name })),
  ]

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-24">
      <SectionHeader
        title="급여 관리"
        level="page"
        action={
          <Button size="sm" variant="secondary" onClick={handleExport}>
            <Download size={14} />
            엑셀
          </Button>
        }
      />

      <HelpBanner label="급여 관리 사용법 보기" onClick={() => setHelpOpen(true)} />
      <HelpTip variant="warning">입력한 급여는 저장 버튼을 눌러야 반영됩니다.</HelpTip>
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="급여 관리 사용법"
        sections={HELP_SECTIONS}
      />

      {/* 작업자 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
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

      {/* 합계 */}
      {!isLoading && filteredApps.length > 0 && (
        <div className="flex items-center justify-between text-sm bg-surface-sunken rounded-xl px-4 py-3">
          <span className="text-text-secondary">
            {activeWorker === 'all' ? '전체 급여 합계' : `${connections.find((c) => c.id === activeWorker)?.display_name ?? ''} 합계`}
          </span>
          <span className="font-bold text-text-primary">
            {totalForWorker > 0 ? `${totalForWorker.toLocaleString('ko-KR')}원` : '—'}
          </span>
        </div>
      )}

      {error && (
        <p className="text-sm text-state-danger text-center">{error}</p>
      )}

      {isLoading && Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 bg-surface rounded-2xl animate-pulse border border-border-subtle" />
      ))}

      {!isLoading && !error && filteredApps.length === 0 && (
        <EmptyState
          icon={<Users size={40} />}
          title="급여 데이터가 없어요"
          description="신청서에서 작업자를 배정하면 여기서 급여를 입력할 수 있습니다."
          bordered
        />
      )}

      {!isLoading && !error && filteredApps.length > 0 && (
        <div className="flex flex-col gap-3">
          {filteredApps.map((app) => {
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
