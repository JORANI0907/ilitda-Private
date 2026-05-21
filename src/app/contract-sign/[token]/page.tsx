'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// ─── 타입 ────────────────────────────────────────────────────────

interface ContractSnapshot {
  html_body:     string | null
  template_name: string | null
  template_type: 'text' | 'upload'
  file_url:      string | null
}

interface ContractData {
  id:                string
  signing_status:    string
  monthly_price:     number
  annual_price:      number
  start_date:        string
  end_date:          string
  contract_snapshot: ContractSnapshot | null
  service_applications: {
    owner_name:    string
    business_name: string
  } | null
}

type PageState = 'loading' | 'error' | 'ready' | 'signing' | 'done' | 'already_signed'

// ─── 유틸 ────────────────────────────────────────────────────────

const fmtKr   = (n: number) => n.toLocaleString('ko-KR')
const fmtDate = (s: string | null) => (s ? s.slice(0, 10) : '—')

// ─── 서명 캔버스 ─────────────────────────────────────────────────

interface SignatureCanvasProps {
  onSign: (dataUrl: string | null) => void
}

function SignatureCanvas({ onSign }: SignatureCanvasProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const isDrawing   = useRef(false)
  const hasSigned   = useRef(false)

  const getPos = (e: MouseEvent | Touch, rect: DOMRect) => ({
    x: (e.clientX - rect.left) * (canvasRef.current!.width  / rect.width),
    y: (e.clientY - rect.top)  * (canvasRef.current!.height / rect.height),
  })

  const startDraw = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    isDrawing.current = true
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((x: number, y: number) => {
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineTo(x, y)
    ctx.stroke()
    hasSigned.current = true
  }, [])

  const endDraw = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false
    const canvas = canvasRef.current
    if (!canvas || !hasSigned.current) return
    onSign(canvas.toDataURL('image/png'))
  }, [onSign])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'

    const onMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      startDraw(getPos(e, rect).x, getPos(e, rect).y)
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDrawing.current) return
      const rect = canvas.getBoundingClientRect()
      draw(getPos(e, rect).x, getPos(e, rect).y)
    }
    const onMouseUp = () => endDraw()

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      const rect  = canvas.getBoundingClientRect()
      startDraw(getPos(touch, rect).x, getPos(touch, rect).y)
    }
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (!isDrawing.current) return
      const touch = e.touches[0]
      const rect  = canvas.getBoundingClientRect()
      draw(getPos(touch, rect).x, getPos(touch, rect).y)
    }
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      endDraw()
    }

    canvas.addEventListener('mousedown',  onMouseDown)
    canvas.addEventListener('mousemove',  onMouseMove)
    canvas.addEventListener('mouseup',    onMouseUp)
    canvas.addEventListener('mouseleave', onMouseUp)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false })

    return () => {
      canvas.removeEventListener('mousedown',  onMouseDown)
      canvas.removeEventListener('mousemove',  onMouseMove)
      canvas.removeEventListener('mouseup',    onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
    }
  }, [startDraw, draw, endDraw])

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasSigned.current = false
    onSign(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-text-primary">서명</label>
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1 text-xs text-text-tertiary hover:text-state-danger transition-colors"
        >
          <Trash2 size={12} />
          서명 지우기
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="w-full rounded-xl border-2 border-dashed border-border bg-surface-sunken touch-none cursor-crosshair"
        style={{ maxHeight: '200px' }}
      />
      <p className="text-xs text-text-tertiary mt-1.5 text-center">
        손가락이나 마우스로 서명해 주세요
      </p>
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────────

export default function ContractSignPage() {
  const { token } = useParams<{ token: string }>()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [contract, setContract]   = useState<ContractData | null>(null)
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)

  // 서명 폼
  const [otpCode, setOtpCode]         = useState('')
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ── 계약서 조회 ──────────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    fetch(`/api/contract-sign/${token}`)
      .then(async r => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? '조회 실패')
        const c: ContractData = json.contract
        if (c.signing_status === 'customer_signed' || c.signing_status === 'completed') {
          setPageState('already_signed')
        } else {
          setContract(c)
          setPageState('ready')
        }
      })
      .catch(e => {
        setErrorMsg(e instanceof Error ? e.message : '유효하지 않은 링크입니다')
        setPageState('error')
      })
  }, [token])

  // ── 서명 제출 ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!otpCode.trim())  { setSubmitError('확인 코드를 입력해 주세요'); return }
    if (!signatureUrl)    { setSubmitError('서명을 해주세요'); return }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const res  = await fetch(`/api/contract-sign/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          otp_code:           otpCode.trim(),
          signature_data_url: signatureUrl,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '서명 실패')
      setPageState('done')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '서명 처리 중 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── 완료 화면 ───────────────────────────────────────────────
  if (pageState === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 bg-surface">
        <div className="w-20 h-20 rounded-full bg-state-success-bg flex items-center justify-center">
          <CheckCircle size={44} className="text-state-success" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">서명이 완료되었습니다</h1>
          <p className="text-sm text-text-secondary break-keep">
            계약서 서명이 완료되었습니다. 담당자가 확인 후 계약을 마무리할 예정입니다.
          </p>
        </div>
      </div>
    )
  }

  // ─── 이미 서명된 화면 ────────────────────────────────────────
  if (pageState === 'already_signed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 bg-surface">
        <div className="w-20 h-20 rounded-full bg-state-info-bg flex items-center justify-center">
          <CheckCircle size={44} className="text-state-info" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">이미 서명된 계약서입니다</h1>
          <p className="text-sm text-text-secondary">이 계약서는 이미 서명이 완료되었습니다.</p>
        </div>
      </div>
    )
  }

  // ─── 로딩 ────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-text-tertiary bg-surface">
        로딩 중…
      </div>
    )
  }

  // ─── 에러 ────────────────────────────────────────────────────
  if (pageState === 'error' || !contract) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-surface">
        <p className="text-lg font-bold text-text-primary">계약서를 불러올 수 없습니다</p>
        <p className="text-sm text-state-danger text-center">{errorMsg ?? '유효하지 않거나 만료된 링크입니다'}</p>
      </div>
    )
  }

  const snapshot  = contract.contract_snapshot
  const isUpload  = snapshot?.template_type === 'upload'
  const app       = contract.service_applications

  // ─── 서명 폼 화면 ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-sunken">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">

        {/* 헤더 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-1">계약서 서명</h1>
          {app && (
            <p className="text-sm text-text-secondary">
              {app.business_name} / {app.owner_name}
            </p>
          )}
        </div>

        {/* 계약 조건 요약 */}
        <div className="rounded-2xl bg-surface border border-border-subtle shadow-soft p-4 mb-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">계약 조건</h2>
          {contract.monthly_price > 0 && (
            <div className="flex justify-between py-2 border-b border-border-subtle text-sm">
              <span className="text-text-tertiary">월 요금</span>
              <span className="font-medium tabular-nums">{fmtKr(contract.monthly_price)}원</span>
            </div>
          )}
          {contract.annual_price > 0 && (
            <div className="flex justify-between py-2 border-b border-border-subtle text-sm">
              <span className="text-text-tertiary">연간 요금</span>
              <span className="font-medium tabular-nums">{fmtKr(contract.annual_price)}원</span>
            </div>
          )}
          <div className="flex justify-between py-2 text-sm">
            <span className="text-text-tertiary">계약 기간</span>
            <span className="font-medium tabular-nums">
              {fmtDate(contract.start_date)} ~ {fmtDate(contract.end_date)}
            </span>
          </div>
        </div>

        {/* 계약서 내용 */}
        {snapshot && (
          <div className="rounded-2xl bg-surface border border-border-subtle shadow-soft p-4 mb-4">
            <h2 className="text-sm font-semibold text-text-primary mb-3">계약서 내용</h2>
            {isUpload && snapshot.file_url ? (
              <iframe
                src={snapshot.file_url}
                className="w-full rounded-xl border border-border-subtle"
                style={{ height: '480px' }}
                title="계약서"
              />
            ) : snapshot.html_body ? (
              <div
                className="prose prose-sm max-w-none text-text-primary text-sm leading-normal overflow-auto max-h-96"
                dangerouslySetInnerHTML={{ __html: snapshot.html_body }}
              />
            ) : null}
          </div>
        )}

        {/* 서명 폼 */}
        <div className="rounded-2xl bg-surface border border-border-subtle shadow-soft p-4 space-y-5">
          <h2 className="text-sm font-semibold text-text-primary">서명 진행</h2>

          {/* OTP 입력 */}
          <Input
            label="확인 코드 (담당자로부터 받은 6자리 코드)"
            value={otpCode}
            onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
          />

          {/* 서명 캔버스 */}
          <SignatureCanvas onSign={setSignatureUrl} />

          {/* 에러 */}
          {submitError && (
            <p className="text-sm text-state-danger text-center">{submitError}</p>
          )}

          {/* 서명 완료 버튼 */}
          <Button
            onClick={handleSubmit}
            isLoading={submitting}
            fullWidth
            disabled={!otpCode || !signatureUrl}
          >
            서명 완료
          </Button>

          <p className="text-[11px] text-text-tertiary text-center leading-relaxed break-keep">
            위 서명으로 계약서 내용에 동의함을 확인합니다.
            서명 후에는 법적 효력이 발생합니다.
          </p>
        </div>
      </div>
    </div>
  )
}
