'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDev = process.env.NODE_ENV === 'development'

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(e.target.value)
    if (formatted.replace(/-/g, '').length <= 11) {
      setPhone(formatted)
    }
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const digits = phone.replace(/-/g, '')
    if (digits.length < 10 || digits.length > 11) {
      setError('올바른 휴대폰 번호를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? '인증번호 발송에 실패했습니다. 다시 시도해주세요.')
        return
      }

      router.push(`/login/verify?phone=${encodeURIComponent(digits)}`)
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 로고 */}
      <div className="text-center pt-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 mb-4">
          <span className="text-white text-2xl font-bold">일</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary">일잇다</h1>
        <p className="mt-1 text-sm text-text-secondary">출근해요 공유해요</p>
      </div>

      {/* 로그인 폼 */}
      <form
        onSubmit={handleSubmit}
        className="bg-surface rounded-2xl shadow-soft p-6 flex flex-col gap-4"
      >
        <Input
          label="휴대폰 번호"
          type="tel"
          inputMode="tel"
          placeholder="010-0000-0000"
          leadingIcon={<Phone size={16} />}
          value={phone}
          onChange={handlePhoneChange}
          error={error ?? undefined}
          autoComplete="tel"
          name="phone"
        />
        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          disabled={phone.replace(/-/g, '').length < 10}
        >
          인증번호 받기
        </Button>
      </form>

      {/* 개발 환경 안내 */}
      {isDev && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-xs text-amber-700 font-medium">개발 모드</p>
          <p className="text-xs text-amber-600 mt-0.5">
            OTP 입력 시 <strong>000000</strong> 을 사용하세요.
          </p>
        </div>
      )}

      <p className="text-center text-xs text-text-tertiary leading-normal px-4">
        로그인하면{' '}
        <span className="text-text-secondary underline">이용약관</span> 및{' '}
        <span className="text-text-secondary underline">개인정보처리방침</span>에
        동의한 것으로 간주됩니다.
      </p>
    </div>
  )
}
