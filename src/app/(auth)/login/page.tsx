import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* 로고 */}
      <div className="text-center pt-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 mb-4">
          <span className="text-white text-2xl font-bold">일</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary">일잇다</h1>
        <p className="mt-1 text-sm text-text-secondary">청소 일감을 잇다</p>
      </div>

      {/* 로그인 폼 — Day 4에 실제 OTP 연동 예정 */}
      <div className="bg-surface rounded-2xl shadow-soft p-6 flex flex-col gap-4">
        <Input
          label="휴대폰 번호"
          type="tel"
          placeholder="010-0000-0000"
          leadingIcon={<Phone size={16} />}
          inputMode="tel"
        />
        <Button fullWidth>
          인증번호 받기
        </Button>
      </div>

      <p className="text-center text-xs text-text-tertiary leading-normal px-4">
        로그인하면 <span className="text-text-secondary underline">이용약관</span> 및{' '}
        <span className="text-text-secondary underline">개인정보처리방침</span>에 동의한 것으로 간주됩니다.
      </p>
    </div>
  )
}
