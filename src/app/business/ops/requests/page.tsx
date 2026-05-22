'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, MapPin, Phone, CalendarClock, Users, LogIn } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { useRouter } from 'next/navigation'
import type { ServiceRequest, RequestStatus, ServiceType, Connection } from '@/types'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'

type Tab = 'all' | RequestStatus

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '신규' },
  { key: 'accepted', label: '수락됨' },
  { key: 'rejected', label: '거절됨' },
]

const STATUS_BADGE: Record<RequestStatus, { label: string; className: string }> = {
  pending:  { label: '신규',   className: 'bg-brand-100 text-brand-700' },
  accepted: { label: '수락됨', className: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '거절됨', className: 'bg-state-danger-bg text-state-danger' },
}

const SERVICE_BADGE: Record<ServiceType, { className: string }> = {
  '1회성케어':  { className: 'bg-surface-sunken text-text-secondary' },
  '정기딥케어': { className: 'bg-brand-100 text-brand-700' },
  '정기엔드케어': { className: 'bg-purple-100 text-purple-700' },
}

interface AcceptForm {
  schedule_date: string
  schedule_time: string
  fee: string
}

interface RejectForm {
  rejected_reason: string
}

function formatDateTime(date: string | null, time: string | null): string {
  if (!date) return '미정'
  const d = new Date(date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  if (!time) return `${month}월 ${day}일`
  return `${month}월 ${day}일 ${time.slice(0, 5)}`
}

// Worker assignment chip
function WorkerChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center h-6 px-2 rounded-full bg-brand-100 text-brand-700 text-xs font-medium break-keep">
      {name}
    </span>
  )
}

export default function RequestsPage() {
  const router = useRouter()
  const [helpOpen, setHelpOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [isDemo, setIsDemo] = useState(false)
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [acceptTarget, setAcceptTarget] = useState<ServiceRequest | null>(null)
  const [rejectTarget, setRejectTarget] = useState<ServiceRequest | null>(null)
  const [acceptForm, setAcceptForm] = useState<AcceptForm>({ schedule_date: '', schedule_time: '', fee: '' })
  const [rejectForm, setRejectForm] = useState<RejectForm>({ rejected_reason: '' })
  const [modalError, setModalError] = useState<string | null>(null)
  const [isModalSubmitting, setIsModalSubmitting] = useState(false)

  // Worker assignment state
  const [connections, setConnections] = useState<Connection[]>([])
  const [assignTarget, setAssignTarget] = useState<ServiceRequest | null>(null)
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (activeTab !== 'all') params.set('status', activeTab)
      const res = await fetch(`/api/business/requests?${params.toString()}`)
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '불러오기에 실패했습니다.')
        return
      }
      setRequests(json.data ?? [])
      setIsDemo(json.isDemo === true)
      if (json.meta?.pending_count !== undefined) {
        setPendingCount(json.meta.pending_count)
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab])

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/business/hr/connections?status=accepted')
      const json = await res.json()
      if (json.success) {
        setConnections(json.data ?? [])
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const handleAccept = async () => {
    if (!acceptTarget) return
    if (!acceptForm.schedule_date) {
      setModalError('일정 날짜를 입력해 주세요.')
      return
    }
    setModalError(null)
    setIsModalSubmitting(true)
    try {
      const res = await fetch(`/api/business/requests/${acceptTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          schedule_date: acceptForm.schedule_date,
          schedule_time: acceptForm.schedule_time || undefined,
          fee: acceptForm.fee ? Number(acceptForm.fee) : undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setModalError(json.error ?? '처리에 실패했습니다.')
        return
      }
      setAcceptTarget(null)
      setAcceptForm({ schedule_date: '', schedule_time: '', fee: '' })
      await fetchRequests()
      if (json.data?.schedule_id) {
        router.push(`/business/ops/schedules/${json.data.schedule_id}`)
      }
    } catch {
      setModalError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsModalSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    setModalError(null)
    setIsModalSubmitting(true)
    try {
      const res = await fetch(`/api/business/requests/${rejectTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejected_reason: rejectForm.rejected_reason || undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setModalError(json.error ?? '처리에 실패했습니다.')
        return
      }
      setRejectTarget(null)
      setRejectForm({ rejected_reason: '' })
      await fetchRequests()
    } catch {
      setModalError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsModalSubmitting(false)
    }
  }

  const openAssignModal = (req: ServiceRequest) => {
    setAssignTarget(req)
    setSelectedWorkers(req.assigned_connection_ids ?? [])
    setAssignError(null)
  }

  const toggleWorker = (id: string) => {
    setSelectedWorkers((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    )
  }

  const handleAssignSave = async () => {
    if (!assignTarget) return
    setIsAssigning(true)
    setAssignError(null)
    try {
      const res = await fetch(`/api/business/hr/requests/${assignTarget.id}/workers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_ids: selectedWorkers }),
      })
      const json = await res.json()
      if (!json.success) {
        setAssignError(json.error ?? '저장에 실패했습니다.')
        return
      }
      // Update local state
      setRequests((prev) => prev.map((r) =>
        r.id === assignTarget.id ? { ...r, assigned_connection_ids: selectedWorkers } : r
      ))
      setAssignTarget(null)
    } catch {
      setAssignError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <SectionHeader title="신청서함" level="page" />

      {/* 도움말 배너 */}
      <HelpBanner label="서비스 요청 수신 사용법 보기" onClick={() => setHelpOpen(true)} />
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="서비스 요청 수신 사용법"
        sections={[
          {
            title: '요청 수락 방법',
            content: '신규 탭에서 고객 신청서를 확인하고 "수락" 버튼을 누르세요.\n수락 시 방문 날짜, 시작 시간, 금액을 입력하면 일정이 자동으로 생성됩니다.',
          },
          {
            title: '요청 거절 방법',
            content: '"거절" 버튼을 누르면 거절 사유를 입력할 수 있습니다.\n거절 사유는 선택 사항이며, 고객에게 전달될 수 있습니다.',
          },
          {
            title: '직원 배정 방법',
            content: '"작업자 배정" 버튼을 탭하면 연결된 작업자 목록이 나타납니다.\n배정할 작업자를 선택 후 저장하면 해당 서비스에 작업자가 배정됩니다.\n작업자 관리에서 작업자를 먼저 등록해야 목록에 표시됩니다.',
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

      {/* 수락 주의 안내 */}
      <HelpTip variant="warning">수락 후에는 취소가 어려우니 일정을 꼭 확인하고 수락해 주세요.</HelpTip>

      {/* 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          const showBadge = tab.key === 'pending' && pendingCount > 0
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`
                shrink-0 h-8 px-4 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5
                ${isActive
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-sunken text-text-secondary hover:bg-border'}
              `}
            >
              {tab.label}
              {showBadge && (
                <span className={`
                  inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold
                  ${isActive ? 'bg-white text-brand-600' : 'bg-state-danger text-white'}
                `}>
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 목록 */}
      <div className="flex flex-col gap-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} padding="md">
            <div className="flex flex-col gap-2">
              <div className="h-4 w-24 bg-surface-sunken rounded animate-pulse" />
              <div className="h-3 w-40 bg-surface-sunken rounded animate-pulse" />
              <div className="h-3 w-32 bg-surface-sunken rounded animate-pulse" />
            </div>
          </Card>
        ))}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-state-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchRequests}>재시도</Button>
          </div>
        )}

        {!isLoading && !error && requests.length === 0 && (
          <EmptyState
            icon={<ClipboardList size={40} />}
            title="신청서가 없어요"
            description="고객이 신청 링크를 통해 신청서를 보내면 여기서 확인할 수 있습니다."
            bordered
          />
        )}

        {!isLoading && !error && requests.map((req) => {
          const statusInfo = STATUS_BADGE[req.status]
          const serviceInfo = req.service_type && req.service_type in SERVICE_BADGE
            ? SERVICE_BADGE[req.service_type as ServiceType]
            : { className: 'bg-surface-sunken text-text-secondary' }

          const assignedNames = (req.assigned_connection_ids ?? [])
            .map((cid) => connections.find((c) => c.id === cid)?.display_name)
            .filter((n): n is string => Boolean(n))

          return (
            <Card key={req.id} padding="md">
              <div className="flex flex-col gap-3">
                {/* 상단 배지 */}
                <div className="flex items-center gap-2 flex-wrap">
                  {req.service_type && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${serviceInfo.className}`}>
                      {req.service_type}
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {/* 정보 */}
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-text-primary">{req.client_name}</p>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-text-secondary flex items-center gap-1.5">
                      <Phone size={13} className="shrink-0 text-text-tertiary" />
                      {req.client_phone}
                    </p>
                    <p className="text-sm text-text-secondary flex items-start gap-1.5">
                      <MapPin size={13} className="shrink-0 text-text-tertiary mt-0.5" />
                      <span className="break-keep">{req.client_address}</span>
                    </p>
                  </div>
                  <p className="text-sm text-text-secondary flex items-center gap-1.5">
                    <CalendarClock size={13} className="shrink-0 text-text-tertiary" />
                    희망일: {formatDateTime(req.desired_date, req.desired_time)}
                  </p>
                  {req.notes && (
                    <p className="text-xs text-text-tertiary mt-1 break-keep">요청: {req.notes}</p>
                  )}
                  {req.status === 'rejected' && req.rejected_reason && (
                    <p className="text-xs text-state-danger mt-1">거절 사유: {req.rejected_reason}</p>
                  )}
                </div>

                {/* 배정된 작업자 칩 표시 */}
                {assignedNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <Users size={13} className="text-text-tertiary shrink-0" />
                    {assignedNames.map((name) => (
                      <WorkerChip key={name} name={name} />
                    ))}
                  </div>
                )}

                {/* 작업자 배정 버튼 */}
                <div className="border-t border-border-subtle" />
                <div className="flex gap-2 flex-wrap">
                  {req.status === 'accepted' || req.status === 'pending' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openAssignModal(req)}
                    >
                      <Users size={14} />
                      작업자 배정
                    </Button>
                  ) : null}

                  {req.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          setAcceptTarget(req)
                          setModalError(null)
                          setAcceptForm({ schedule_date: req.desired_date ?? '', schedule_time: req.desired_time ?? '', fee: '' })
                        }}
                      >
                        수락
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setRejectTarget(req)
                          setModalError(null)
                          setRejectForm({ rejected_reason: '' })
                        }}
                      >
                        거절
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* 수락 모달 */}
      <Modal
        open={!!acceptTarget}
        onClose={() => { setAcceptTarget(null); setModalError(null) }}
        title="신청서 수락"
        footer={
          <>
            <Button fullWidth onClick={handleAccept} isLoading={isModalSubmitting}>확인</Button>
            <Button variant="ghost" fullWidth onClick={() => setAcceptTarget(null)}>취소</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary break-keep">
            {acceptTarget?.client_name}님의 신청서를 수락하고 일정을 생성합니다.
          </p>
          <Input
            label="일정 날짜 *"
            type="date"
            value={acceptForm.schedule_date}
            onChange={(e) => setAcceptForm({ ...acceptForm, schedule_date: e.target.value })}
          />
          <Input
            label="시작 시간"
            type="time"
            value={acceptForm.schedule_time}
            onChange={(e) => setAcceptForm({ ...acceptForm, schedule_time: e.target.value })}
          />
          <Input
            label="금액 (원)"
            type="number"
            placeholder="예: 150000"
            value={acceptForm.fee}
            onChange={(e) => setAcceptForm({ ...acceptForm, fee: e.target.value })}
          />
          {modalError && <p className="text-sm text-state-danger">{modalError}</p>}
        </div>
      </Modal>

      {/* 거절 모달 */}
      <Modal
        open={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setModalError(null) }}
        title="신청서 거절"
        footer={
          <>
            <Button variant="danger" fullWidth onClick={handleReject} isLoading={isModalSubmitting}>거절</Button>
            <Button variant="ghost" fullWidth onClick={() => setRejectTarget(null)}>취소</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary break-keep">
            {rejectTarget?.client_name}님의 신청서를 거절합니다.
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">거절 사유 (선택)</label>
            <textarea
              rows={3}
              placeholder="거절 사유를 입력해 주세요 (선택)"
              value={rejectForm.rejected_reason}
              onChange={(e) => setRejectForm({ rejected_reason: e.target.value })}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none leading-normal"
            />
          </div>
          {modalError && <p className="text-sm text-state-danger">{modalError}</p>}
        </div>
      </Modal>

      {/* 작업자 배정 모달 */}
      <Modal
        open={!!assignTarget}
        onClose={() => { setAssignTarget(null); setAssignError(null) }}
        title="작업자 배정"
        footer={
          <>
            <Button fullWidth onClick={handleAssignSave} isLoading={isAssigning}>저장</Button>
            <Button variant="ghost" fullWidth onClick={() => setAssignTarget(null)}>취소</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary break-keep">
            {assignTarget?.client_name} 신청서에 배정할 작업자를 선택하세요.
          </p>

          {connections.length === 0 ? (
            <div className="text-sm text-text-tertiary text-center py-4">
              연결된 작업자가 없습니다.
              작업자 관리에서 작업자를 추가해 주세요.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {connections.map((conn) => {
                const isSelected = selectedWorkers.includes(conn.id)
                return (
                  <button
                    key={conn.id}
                    type="button"
                    onClick={() => toggleWorker(conn.id)}
                    className={`
                      flex items-center gap-3 p-3 rounded-xl border transition-colors text-left
                      ${isSelected
                        ? 'border-brand-600 bg-brand-50'
                        : 'border-border bg-surface hover:bg-surface-sunken'}
                    `}
                  >
                    <div className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center shrink-0
                      ${isSelected ? 'border-brand-600 bg-brand-600' : 'border-border'}
                    `}>
                      {isSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-text-primary">{conn.display_name}</span>
                      {(conn.manual_phone ?? conn.profiles?.phone) && (
                        <p className="text-xs text-text-tertiary">{conn.manual_phone ?? conn.profiles?.phone}</p>
                      )}
                    </div>
                    {isSelected && (
                      <Badge variant="primary">선택됨</Badge>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {selectedWorkers.length > 0 && (
            <div className="bg-brand-50 rounded-xl p-3">
              <p className="text-xs text-brand-700 font-medium mb-1">선택된 작업자</p>
              <div className="flex flex-wrap gap-1">
                {selectedWorkers.map((wid) => {
                  const name = connections.find((c) => c.id === wid)?.display_name ?? wid
                  return <WorkerChip key={wid} name={name} />
                })}
              </div>
            </div>
          )}

          {assignError && (
            <p className="text-sm text-state-danger">{assignError}</p>
          )}
        </div>
      </Modal>

      <div className="h-4" />
    </div>
  )
}
