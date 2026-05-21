'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Send, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { SectionHeader } from '@/components/ui/SectionHeader'

// ─── 타입 ────────────────────────────────────────────────────────

type SigningStatus = 'draft' | 'pending_customer' | 'customer_signed' | 'completed' | 'voided'

interface ContractSnapshot {
  html_body:     string | null
  template_name: string | null
  template_type: 'text' | 'upload'
  file_url:      string | null
}

interface ContractDetail {
  id:                string
  signing_status:    SigningStatus
  monthly_price:     number
  annual_price:      number
  start_date:        string
  end_date:          string
  customer_phone:    string
  selected_items:    string[]
  contract_snapshot: ContractSnapshot | null
  void_reason:       string | null
  voided_at:         string | null
  customer_agreed_at: string | null
  created_at:        string
  service_applications: {
    owner_name:    string
    business_name: string
    phone:         string
    address:       string | null
  } | null
}

// ─── 상수 ────────────────────────────────────────────────────────

const STATUS_LABEL: Record<SigningStatus, string> = {
  draft:            '초안',
  pending_customer: '서명대기',
  customer_signed:  '고객서명완료',
  completed:        '완료',
  voided:           '파기',
}

const STATUS_VARIANT: Record<SigningStatus, 'default' | 'warning' | 'info' | 'success' | 'danger' | 'primary'> = {
  draft:            'default',
  pending_customer: 'warning',
  customer_signed:  'info',
  completed:        'success',
  voided:           'danger',
}

// ─── 유틸 ────────────────────────────────────────────────────────

const fmtKr   = (n: number) => n.toLocaleString('ko-KR')
const fmtDate = (s: string | null) => (s ? s.slice(0, 10) : '—')
const fmtDt   = (s: string | null) => (s ? new Date(s).toLocaleString('ko-KR') : '—')

// ─── 섹션 헬퍼 ───────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-border-subtle last:border-0">
      <span className="w-24 flex-shrink-0 text-xs text-text-tertiary">{label}</span>
      <span className="text-sm text-text-primary break-all">{value || '—'}</span>
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────────

export default function ContractDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [loading, setLoading]   = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 상태별 액션 로딩
  const [otpLoading,      setOtpLoading]      = useState(false)
  const [completeLoading, setCompleteLoading] = useState(false)
  const [actionError,     setActionError]     = useState<string | null>(null)
  const [actionSuccess,   setActionSuccess]   = useState<string | null>(null)

  // 파기 모달
  const [showVoid, setShowVoid]       = useState(false)
  const [voidReason, setVoidReason]   = useState('')
  const [voidLoading, setVoidLoading] = useState(false)
  const [voidError, setVoidError]     = useState<string | null>(null)

  // ── 계약서 조회 ──────────────────────────────────────────────
  const loadContract = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res  = await fetch(`/api/admin/contracts/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '조회 실패')
      setContract(json.contract)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '조회 실패')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadContract() }, [loadContract])

  // ── 알림 자동 소거 ─────────────────────────────────────────
  useEffect(() => {
    if (!actionSuccess) return
    const t = setTimeout(() => setActionSuccess(null), 3000)
    return () => clearTimeout(t)
  }, [actionSuccess])

  // ── OTP 발송 ─────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setOtpLoading(true)
    setActionError(null)
    try {
      const res  = await fetch(`/api/admin/contracts/${id}/send-otp`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'OTP 발송 실패')
      setActionSuccess('OTP가 발송되었습니다')
      await loadContract()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'OTP 발송 실패')
    } finally {
      setOtpLoading(false)
    }
  }

  // ── 계약 완료 처리 ────────────────────────────────────────────
  const handleComplete = async () => {
    setCompleteLoading(true)
    setActionError(null)
    try {
      const res  = await fetch(`/api/admin/contracts/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ signing_status: 'completed', admin_signed_at: new Date().toISOString() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '처리 실패')
      setActionSuccess('계약이 완료 처리되었습니다')
      await loadContract()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '처리 실패')
    } finally {
      setCompleteLoading(false)
    }
  }

  // ── 파기 ─────────────────────────────────────────────────────
  const handleVoid = async () => {
    if (!voidReason.trim()) { setVoidError('파기 사유를 입력해 주세요'); return }
    setVoidLoading(true)
    setVoidError(null)
    try {
      const res  = await fetch(`/api/admin/contracts/${id}/void`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reason: voidReason.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '파기 실패')
      setShowVoid(false)
      setVoidReason('')
      setActionSuccess('계약서가 파기되었습니다')
      await loadContract()
    } catch (e) {
      setVoidError(e instanceof Error ? e.message : '파기 실패')
    } finally {
      setVoidLoading(false)
    }
  }

  // ─── 로딩 / 에러 ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-sm text-text-tertiary">
        로딩 중…
      </div>
    )
  }
  if (errorMsg || !contract) {
    return (
      <div className="px-4 pt-6">
        <p className="text-sm text-state-danger">{errorMsg ?? '계약서를 찾을 수 없습니다'}</p>
      </div>
    )
  }

  const snapshot  = contract.contract_snapshot
  const isUpload  = snapshot?.template_type === 'upload'
  const app       = contract.service_applications
  const canVoid   = contract.signing_status !== 'voided' && contract.signing_status !== 'completed'

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">

      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 -ml-1 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <SectionHeader title="계약서 상세" level="page" className="flex-1" />
        <Badge variant={STATUS_VARIANT[contract.signing_status]}>
          {STATUS_LABEL[contract.signing_status]}
        </Badge>
      </div>

      {/* 알림 */}
      {actionSuccess && (
        <div className="px-4 py-3 rounded-xl bg-state-success-bg border border-state-success text-sm text-state-success">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="px-4 py-3 rounded-xl bg-state-danger-bg border border-state-danger text-sm text-state-danger">
          {actionError}
        </div>
      )}

      {/* 고객 정보 */}
      <section className="rounded-2xl bg-surface border border-border-subtle shadow-flat p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">고객 정보</h3>
        <InfoRow label="업체명"  value={app?.business_name ?? '—'} />
        <InfoRow label="대표자"  value={app?.owner_name    ?? '—'} />
        <InfoRow label="연락처"  value={contract.customer_phone}   />
        <InfoRow label="주소"    value={app?.address        ?? '—'} />
      </section>

      {/* 계약 조건 */}
      <section className="rounded-2xl bg-surface border border-border-subtle shadow-flat p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">계약 조건</h3>
        {contract.monthly_price > 0 && (
          <InfoRow label="월 요금"  value={`${fmtKr(contract.monthly_price)}원`} />
        )}
        {contract.annual_price > 0 && (
          <InfoRow label="연간 요금" value={`${fmtKr(contract.annual_price)}원`} />
        )}
        <InfoRow label="시작일"   value={fmtDate(contract.start_date)} />
        <InfoRow label="종료일"   value={fmtDate(contract.end_date)}   />
        {contract.selected_items?.length > 0 && (
          <InfoRow label="서비스 범위" value={contract.selected_items.join(', ')} />
        )}
        <InfoRow label="생성일"   value={fmtDate(contract.created_at)} />
        {contract.customer_agreed_at && (
          <InfoRow label="고객서명일" value={fmtDt(contract.customer_agreed_at)} />
        )}
      </section>

      {/* 파기 정보 */}
      {contract.signing_status === 'voided' && (
        <section className="rounded-2xl bg-state-danger-bg border border-state-danger p-4">
          <h3 className="text-sm font-semibold text-state-danger mb-2">파기됨</h3>
          <p className="text-xs text-state-danger">{fmtDt(contract.voided_at)}</p>
          <p className="text-sm text-state-danger mt-1">{contract.void_reason}</p>
        </section>
      )}

      {/* 계약서 내용 */}
      {snapshot && (
        <section className="rounded-2xl bg-surface border border-border-subtle shadow-flat p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            계약서 내용
            {snapshot.template_name && (
              <span className="ml-2 text-xs font-normal text-text-tertiary">
                ({snapshot.template_name})
              </span>
            )}
          </h3>
          {isUpload && snapshot.file_url ? (
            <iframe
              src={snapshot.file_url}
              className="w-full rounded-xl border border-border-subtle"
              style={{ height: '480px' }}
              title="계약서"
            />
          ) : snapshot.html_body ? (
            <div
              className="prose prose-sm max-w-none text-text-primary text-sm leading-normal"
              dangerouslySetInnerHTML={{ __html: snapshot.html_body }}
            />
          ) : (
            <p className="text-sm text-text-tertiary">계약서 내용이 없습니다</p>
          )}
        </section>
      )}

      {/* 상태별 액션 */}
      <div className="flex flex-col gap-3">
        {(contract.signing_status === 'draft') && (
          <Button onClick={handleSendOtp} isLoading={otpLoading} fullWidth>
            <Send size={16} />
            OTP 발송
          </Button>
        )}
        {contract.signing_status === 'pending_customer' && (
          <Button variant="secondary" onClick={handleSendOtp} isLoading={otpLoading} fullWidth>
            <RotateCcw size={16} />
            재발송
          </Button>
        )}
        {contract.signing_status === 'customer_signed' && (
          <Button onClick={handleComplete} isLoading={completeLoading} fullWidth>
            <CheckCircle size={16} />
            계약 완료 처리
          </Button>
        )}
        {canVoid && (
          <Button variant="danger" onClick={() => { setShowVoid(true); setVoidError(null); setVoidReason('') }} fullWidth>
            <XCircle size={16} />
            파기
          </Button>
        )}
      </div>

      {/* pending_customer 안내 */}
      {contract.signing_status === 'pending_customer' && (
        <p className="text-xs text-text-tertiary text-center">
          고객에게 OTP가 발송되었습니다. 서명을 기다리는 중입니다.
        </p>
      )}

      {/* ── 파기 모달 ─────────────────────────────────────────── */}
      <Modal
        open={showVoid}
        onClose={() => setShowVoid(false)}
        title="계약서 파기"
        description="파기 후에는 복구할 수 없습니다."
        footer={
          <>
            {voidError && (
              <p className="text-xs text-state-danger text-center">{voidError}</p>
            )}
            <Button variant="danger" onClick={handleVoid} isLoading={voidLoading} fullWidth>
              파기 확인
            </Button>
          </>
        }
      >
        <Textarea
          label="파기 사유"
          value={voidReason}
          onChange={e => setVoidReason(e.target.value)}
          placeholder="파기 사유를 입력해 주세요"
          rows={4}
        />
      </Modal>
    </div>
  )
}
