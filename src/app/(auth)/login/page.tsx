'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { HelpTip } from '@/components/ui/HelpTip'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? '로그인에 실패했습니다.')
        return
      }

      const role = json.data?.role ?? 'business'
      router.push(`/${role}/home`)
      router.refresh()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
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
          label="이메일"
          type="email"
          placeholder="이메일 입력"
          leadingIcon={<Mail size={16} />}
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null) }}
          autoComplete="email"
          name="email"
        />
        <HelpTip className="mt-1">
          가입 시 사용한 이메일 주소를 입력하세요. 비밀번호를 잊으셨다면 아래 &apos;비밀번호 찾기&apos;를 눌러주세요.
        </HelpTip>
        <Input
          label="비밀번호"
          type="password"
          placeholder="비밀번호 입력"
          leadingIcon={<Lock size={16} />}
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null) }}
          error={error ?? undefined}
          autoComplete="current-password"
          name="password"
        />
        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          disabled={!email.trim() || !password.trim()}
        >
          로그인
        </Button>
      </form>

      {/* 회원가입 */}
      <div className="text-center">
        <span className="text-sm text-text-secondary">계정이 없으신가요? </span>
        <Link href="/login/register" className="text-sm font-semibold text-brand-600">
          회원가입
        </Link>
      </div>

      <p className="text-center text-xs text-text-tertiary leading-normal px-4">
        로그인하면{' '}
        <span className="text-text-secondary underline">이용약관</span> 및{' '}
        <span className="text-text-secondary underline">개인정보처리방침</span>에
        동의한 것으로 간주됩니다.
      </p>
    </div>
  )
}
