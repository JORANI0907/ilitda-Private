'use client'

import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { HelpTip } from '@/components/ui/HelpTip'

// ─── OTP 입력 6칸 컴포넌트 ───────────────────────────────────
interface OtpInputProps {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}

function OtpInput({ value, onChange, disabled }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const arr = value.split('')
    arr[index] = char
    const next = arr.join('').slice(0, 6)
    onChange(next.padEnd(6, '').slice(0, 6).trimEnd())
    // 다음 칸으로 이동
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      onChange(pasted)
      const nextIdx = Math.min(pasted.length, 5)
      inputRefs.current[nextIdx]?.focus()
      e.preventDefault()
    }
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={el => { inputRefs.current[i] = el }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          disabled={disabled}
          aria-label={`인증번호 ${i + 1}번째 자리`}
          className="
            w-11 h-14 text-center text-xl font-bold
            rounded-xl border border-border
            bg-surface text-text-primary
            focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500
            disabled:bg-surface-sunken disabled:text-text-tertiary disabled:cursor-not-allowed
            transition-colors
          "
        />
      ))}
    </div>
  )
}

// ─── 인증 페이지 내부 (useSearchParams 사용) ────────────────
function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') ?? ''

  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendSeconds, setResendSeconds] = useState(30)
  const [isResending, setIsResending] = useState(false)

  // 타이머
  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = setTimeout(() => setResendSeconds(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendSeconds])

  const handleVerify = useCallback(async () => {
    if (otp.length !== 6) return
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? '인증에 실패했습니다. 다시 시도해주세요.')
        return
      }

      if (json.data?.isNewUser) {
        router.push('/login/setup')
      } else {
        router.push('/business/home')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }, [otp, phone, router])

  // OTP 6자리 완성되면 자동 제출
  useEffect(() => {
    if (otp.length === 6) {
      handleVerify()
    }
  }, [otp, handleVerify])

  async function handleResend() {
    setIsResending(true)
    setError(null)
    setOtp('')

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? '재발송에 실패했습니다.')
        return
      }

      setResendSeconds(30)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsResending(false)
    }
  }

  const maskedPhone = phone
    ? `${phone.slice(0, 3)}-****-${phone.slice(-4)}`
    : ''

  return (
    <div className="flex flex-col gap-8">
      {/* 헤더 */}
      <div className="text-center pt-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 mb-4">
          <span className="text-white text-2xl font-bold">일</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary">인증번호 입력</h1>
        {maskedPhone && (
          <p className="mt-1 text-sm text-text-secondary">
            {maskedPhone}로 발송된 6자리를 입력하세요.
          </p>
        )}
      </div>

      {/* 도움말 */}
      <HelpTip>
        이메일로 발송된 6자리 숫자를 입력하세요. 코드는 10분간 유효하며, 받지 못하셨다면 아래 &apos;재발송&apos;을 눌러주세요.
      </HelpTip>

      {/* 인증 폼 */}
      <div className="bg-surface rounded-2xl shadow-soft p-6 flex flex-col gap-6">
        <OtpInput
          value={otp}
          onChange={val => { setOtp(val); setError(null) }}
          disabled={isLoading}
        />

        {error && (
          <p className="text-center text-sm text-state-danger">{error}</p>
        )}

        <Button
          fullWidth
          isLoading={isLoading}
          onClick={handleVerify}
          disabled={otp.length !== 6 || isLoading}
        >
          인증하기
        </Button>

        {/* 재발송 */}
        <div className="text-center">
          {resendSeconds > 0 ? (
            <p className="text-sm text-text-tertiary">
              {resendSeconds}초 후 재발송 가능
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-sm text-brand-600 underline disabled:opacity-50"
            >
              {isResending ? '발송 중...' : '인증번호 다시 받기'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 페이지 (Suspense 래핑) ──────────────────────────────────
export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-40">
          <span className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  )
}
