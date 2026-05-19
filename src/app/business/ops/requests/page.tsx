'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, MapPin, Phone, CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { useRouter } from 'next/navigation'
import type { ServiceRequest, RequestStatus, ServiceType } from '@/types'

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

export default function RequestsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('all')
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
      if (json.meta?.pending_count !== undefined) {
        setPendingCount(json.meta.pending_count)
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

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

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <SectionHeader title="신청서함" level="page" />

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
          const serviceInfo = SERVICE_BADGE[req.service_type]
          return (
            <Card key={req.id} padding="md">
              <div className="flex flex-col gap-3">
                {/* 상단 배지 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${serviceInfo.className}`}>
                    {req.service_type}
                  </span>
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

                {/* 액션 버튼 (pending만) */}
                {req.status === 'pending' && (
                  <>
                    <div className="border-t border-border-subtle" />
                    <div className="flex gap-2">
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
                    </div>
                  </>
                )}
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

      <div className="h-4" />
    </div>
  )
}
