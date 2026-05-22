'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Lock, Phone, Building2, ChevronLeft, CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { HelpTip } from '@/components/ui/HelpTip'
import { HelpIcon } from '@/components/ui/HelpIcon'

type EmailStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

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
  const [role, setRole] = useState<'business' | 'worker'>('business')
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle')
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

    const clean = email.trim().toLowerCase()
    if (!clean) { setEmailStatus('idle'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setEmailStatus('invalid'); return }

    setEmailStatus('checking')
    checkTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?email=${encodeURIComponent(clean)}`)
        const json = await res.json()
        setEmailStatus(json.data?.available ? 'available' : 'taken')
      } catch {
        setEmailStatus('idle')
      }
    }, 500)

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current)
    }
  }, [email])

  function validateStep1(): string | null {
    const cleanEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return '올바른 이메일 형식을 입력해주세요.'
    if (emailStatus === 'taken') return '이미 사용 중인 이메일입니다.'
    if (emailStatus === 'checking') return '이메일 확인 중입니다. 잠시 후 다시 시도해주세요.'
    if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다.'
    if (password !== passwordConfirm) return '비밀번호가 일치하지 않습니다.'
    if (!name.trim()) return '이름을 입력해주세요.'
    if (role === 'business' && !businessName.trim()) return '상호명을 입력해주세요.'
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
          phone: digits,
          otp,
          role,
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

      const finalRole = json.data?.role ?? role
      router.push(`/${finalRole}/home`)
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
          {/* 역할 토글 */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-sm font-medium text-text-primary">역할 선택 <span className="text-state-danger">*</span></p>
              <HelpIcon
                title="역할이란?"
                description="사업자: 청소 일감을 등록하고 용역자를 관리하는 업주입니다. 직원을 초대하거나 스케줄을 관리할 수 있어요.&#10;&#10;작업자: 일감을 받아 현장에서 일하는 분입니다. 배정된 일정을 확인하고 출퇴근을 기록할 수 있어요."
              />
            </div>
            <div className="flex bg-surface-sunken rounded-xl p-1 gap-1">
              {([
                {
                  key: 'business' as const,
                  label: '사업자',
                  desc: '직원을 관리해요',
                  helpTitle: '사업자 계정',
                  helpDesc: '청소 일감을 등록하고 용역자를 구하는 업주 계정입니다. 스케줄 관리, 직원 초대, 매출 확인 등을 할 수 있어요.',
                },
                {
                  key: 'worker' as const,
                  label: '작업자',
                  desc: '일감을 받아요',
                  helpTitle: '작업자 계정',
                  helpDesc: '청소 일감을 찾아 수입을 올리는 용역자 계정입니다. 배정된 일정 확인과 출퇴근 기록이 가능해요.',
                },
              ]).map(({ key, label, desc, helpTitle, helpDesc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setRole(key); setError(null) }}
                  className={`
                    flex-1 flex flex-col items-center py-3 px-2 rounded-lg text-center transition-all
                    ${role === key
                      ? 'bg-white shadow-soft'
                      : 'text-text-secondary hover:text-text-primary'}
                  `}
                >
                  <span className={`text-sm font-semibold ${role === key ? 'text-brand-600' : 'text-text-primary'} flex items-center gap-1`}>
                    {label}
                    <HelpIcon title={helpTitle} description={helpDesc} />
                  </span>
                  <span className="text-xs text-text-tertiary mt-0.5">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 이메일 */}
          <div>
            <Input
              label="이메일"
              type="email"
              placeholder="example@email.com"
              leadingIcon={<Mail size={16} />}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null) }}
              autoComplete="email"
              name="email"
              trailingIcon={
                emailStatus === 'checking' ? <Loader2 size={16} className="animate-spin text-text-tertiary" /> :
                emailStatus === 'available' ? <CheckCircle2 size={16} className="text-state-success" /> :
                emailStatus === 'taken'     ? <XCircle size={16} className="text-state-danger" /> :
                undefined
              }
            />
            <HelpTip className="mt-1.5">
              로그인 시 사용할 이메일 주소를 입력하세요. 나중에 변경하기 어려우니 자주 사용하는 이메일을 권장합니다.
            </HelpTip>
            {emailStatus === 'available' && (
              <p className="mt-1 text-xs text-state-success">사용 가능한 이메일입니다.</p>
            )}
            {emailStatus === 'taken' && (
              <p className="mt-1 text-xs text-state-danger">이미 사용 중인 이메일입니다.</p>
            )}
            {emailStatus === 'invalid' && email.trim() && (
              <p className="mt-1 text-xs text-state-danger">올바른 이메일 형식이 아닙니다.</p>
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
          <HelpTip>비밀번호는 8자 이상이어야 합니다. 영문, 숫자, 특수문자를 조합하면 더 안전합니다.</HelpTip>
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

          {/* 상호명 — 사업자일 때만 */}
          {role === 'business' && (
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
          <HelpTip>
            휴대폰 번호로 인증코드를 발송합니다. 본인 명의의 번호를 입력하고 &apos;인증번호&apos; 버튼을 눌러주세요.
          </HelpTip>

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

          {/* OTP */}
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
          {role === 'business' && (
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
