'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Lock, Phone, Building2, ChevronLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [isBusiness, setIsBusiness] = useState(true)
  const [isWorker, setIsWorker] = useState(false)
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')

  // Step 2
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otp, setOtp] = useState('')
  const [address, setAddress] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')

  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current)

    const clean = username.trim().toLowerCase()
    if (!clean) { setUsernameStatus('idle'); return }
    if (!/^[a-z0-9_]{4,20}$/.test(clean)) { setUsernameStatus('invalid'); return }

    setUsernameStatus('checking')
    checkTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(clean)}`)
        const json = await res.json()
        setUsernameStatus(json.data?.available ? 'available' : 'taken')
      } catch {
        setUsernameStatus('idle')
      }
    }, 500)

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current)
    }
  }, [username])

  function validateStep1(): string | null {
    if (!isBusiness && !isWorker) return '역할을 하나 이상 선택해주세요.'
    if (usernameStatus === 'invalid' || !/^[a-z0-9_]{4,20}$/.test(username.trim().toLowerCase()))
      return '아이디는 4~20자 영문 소문자·숫자·_만 사용 가능합니다.'
    if (usernameStatus === 'taken') return '이미 사용 중인 아이디입니다.'
    if (usernameStatus === 'checking') return '아이디 확인 중입니다. 잠시 후 다시 시도해주세요.'
    if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다.'
    if (password !== passwordConfirm) return '비밀번호가 일치하지 않습니다.'
    if (!name.trim()) return '이름을 입력해주세요.'
    if (isBusiness && !businessName.trim()) return '상호명을 입력해주세요.'
    return null
  }

  function handleNext() {
    const err = validateStep1()
    if (err) { setError(err); return }
    setError(null)
    setStep(2)
  }

  async function handleSendOtp() {
    const digits = phone.replace(/-/g, '')
    if (digits.length < 10) { setError('올바른 휴대폰 번호를 입력해주세요.'); return }
    setOtpLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? '인증번호 발송에 실패했습니다.'); return }
      setOtpSent(true)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const digits = phone.replace(/-/g, '')
    if (!otpSent) { setError('인증번호를 먼저 발송해주세요.'); return }
    if (otp.length !== 6) { setError('6자리 인증번호를 입력해주세요.'); return }

    setIsLoading(true)
    setError(null)

    try {
      const active_role = isBusiness ? 'business' : 'worker'
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
          name: name.trim(),
          phone: digits,
          otp,
          active_role,
          is_business: isBusiness,
          is_worker: isWorker,
          business_name: businessName.trim() || undefined,
          address: address.trim() || undefined,
          business_number: businessNumber.trim() || undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? '회원가입에 실패했습니다.')
        return
      }

      const role = json.data?.role ?? active_role
      router.push(`/${role}/home`)
      router.refresh()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3 pt-4">
        {step === 2 ? (
          <button onClick={() => { setStep(1); setError(null) }} className="p-1 -ml-1 rounded-lg hover:bg-surface-sunken text-text-secondary">
            <ChevronLeft size={22} />
          </button>
        ) : (
          <Link href="/login" className="p-1 -ml-1 rounded-lg hover:bg-surface-sunken text-text-secondary">
            <ChevronLeft size={22} />
          </Link>
        )}
        <div>
          <h1 className="text-xl font-bold text-text-primary">회원가입</h1>
          <p className="text-xs text-text-tertiary mt-0.5">{step}/2단계</p>
        </div>
      </div>

      {/* 진행 바 */}
      <div className="h-1 bg-surface-sunken rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-600 rounded-full transition-all duration-300"
          style={{ width: step === 1 ? '50%' : '100%' }}
        />
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          {/* 역할 선택 */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">역할 선택 <span className="text-state-danger">*</span></p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'business', label: '사업자', desc: '직원을 관리해요' },
                { key: 'worker',   label: '작업자', desc: '일감을 받아요' },
              ].map(({ key, label, desc }) => {
                const checked = key === 'business' ? isBusiness : isWorker
                const toggle = key === 'business'
                  ? () => setIsBusiness(p => !p)
                  : () => setIsWorker(p => !p)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { toggle(); setError(null) }}
                    className={`
                      flex flex-col items-start p-3 rounded-xl border-2 text-left transition-colors
                      ${checked
                        ? 'border-brand-600 bg-brand-50/40'
                        : 'border-border bg-surface hover:border-border-strong'}
                    `}
                  >
                    <span className={`text-sm font-semibold ${checked ? 'text-brand-600' : 'text-text-primary'}`}>{label}</span>
                    <span className="text-xs text-text-tertiary mt-0.5">{desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 아이디 */}
          <div>
            <Input
              label="아이디"
              type="text"
              placeholder="4~20자 영문 소문자·숫자·_"
              leadingIcon={<User size={16} />}
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null) }}
              autoComplete="username"
              name="username"
              trailingIcon={
                usernameStatus === 'checking' ? <Loader2 size={16} className="animate-spin text-text-tertiary" /> :
                usernameStatus === 'available' ? <CheckCircle2 size={16} className="text-state-success" /> :
                usernameStatus === 'taken' ? <XCircle size={16} className="text-state-danger" /> :
                undefined
              }
            />
            {usernameStatus === 'available' && (
              <p className="mt-1 text-xs text-state-success">사용 가능한 아이디입니다.</p>
            )}
            {usernameStatus === 'taken' && (
              <p className="mt-1 text-xs text-state-danger">이미 사용 중인 아이디입니다.</p>
            )}
            {usernameStatus === 'invalid' && username.trim() && (
              <p className="mt-1 text-xs text-state-danger">4~20자 영문 소문자·숫자·_만 사용 가능합니다.</p>
            )}
          </div>

          {/* 비밀번호 */}
          <Input
            label="비밀번호"
            type="password"
            placeholder="8자 이상"
            leadingIcon={<Lock size={16} />}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null) }}
            autoComplete="new-password"
            name="password"
          />
          <Input
            label="비밀번호 확인"
            type="password"
            placeholder="비밀번호 재입력"
            leadingIcon={<Lock size={16} />}
            value={passwordConfirm}
            onChange={(e) => { setPasswordConfirm(e.target.value); setError(null) }}
            autoComplete="new-password"
            name="password_confirm"
          />

          {/* 이름 */}
          <Input
            label="이름 (대표자명)"
            type="text"
            placeholder="실명 입력"
            leadingIcon={<User size={16} />}
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null) }}
            name="name"
          />

          {/* 상호명 - 사업자일 때만 */}
          {isBusiness && (
            <Input
              label="상호명"
              type="text"
              placeholder="사업체 이름 입력"
              leadingIcon={<Building2 size={16} />}
              value={businessName}
              onChange={(e) => { setBusinessName(e.target.value); setError(null) }}
              name="business_name"
            />
          )}

          {error && <p className="text-sm text-state-danger text-center">{error}</p>}

          <Button fullWidth onClick={handleNext}>
            다음 단계
          </Button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 연락처 */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-1.5">
              연락처 <span className="text-state-danger">*</span>
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value)
                    if (formatted.replace(/-/g, '').length <= 11) setPhone(formatted)
                    setError(null)
                  }}
                  className="block w-full h-12 rounded-md bg-surface border border-border text-text-primary placeholder:text-text-tertiary px-4 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
                  autoComplete="tel"
                  disabled={otpSent}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSendOtp}
                isLoading={otpLoading}
                disabled={phone.replace(/-/g, '').length < 10 || otpSent}
                className="flex-shrink-0 whitespace-nowrap"
              >
                {otpSent ? '발송완료' : '인증번호'}
              </Button>
            </div>
          </div>

          {/* OTP 입력 */}
          {otpSent && (
            <Input
              label="인증번호"
              type="text"
              inputMode="numeric"
              placeholder="6자리 숫자 입력"
              maxLength={6}
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(null) }}
              name="otp"
            />
          )}

          {/* 사업자번호 (선택) */}
          {isBusiness && (
            <Input
              label="사업자번호 (선택)"
              type="text"
              placeholder="000-00-00000"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(e.target.value)}
              name="business_number"
            />
          )}

          {/* 주소 (선택) */}
          <Input
            label="주소 (선택)"
            type="text"
            placeholder="사업장 주소"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            name="address"
          />

          {error && <p className="text-sm text-state-danger text-center">{error}</p>}

          <Button
            type="submit"
            fullWidth
            isLoading={isLoading}
            disabled={!otpSent || otp.length !== 6}
          >
            가입 완료
          </Button>
        </form>
      )}

      <p className="text-center text-xs text-text-tertiary leading-normal px-4 pb-4">
        가입하면{' '}
        <span className="text-text-secondary underline">이용약관</span> 및{' '}
        <span className="text-text-secondary underline">개인정보처리방침</span>에
        동의한 것으로 간주됩니다.
      </p>
    </div>
  )
}
