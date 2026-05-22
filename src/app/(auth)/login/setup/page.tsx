'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'
import type { ActiveRole } from '@/types'

// ─── 타입 ────────────────────────────────────────────────────
interface BusinessInfo {
  business_name: string
  registration_number: string
  address: string
}

interface WorkerInfo {
  birthdate: string
  account_bank: string
  account_number: string
}

interface TermsState {
  terms: boolean
  privacy: boolean
  location: boolean
  matching: boolean
}

// ─── 약관 항목 ────────────────────────────────────────────────
const TERMS_ITEMS = [
  { key: 'terms' as const,    label: '이용약관 동의',           required: true },
  { key: 'privacy' as const,  label: '개인정보처리방침 동의',   required: true },
  { key: 'location' as const, label: '위치정보 이용 동의',      required: false },
  { key: 'matching' as const, label: '매칭플랫폼 이용 고지 확인', required: false },
]

// ─── 단계 표시 ────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i < current
              ? 'w-6 bg-brand-600'
              : i === current
                ? 'w-6 bg-brand-400'
                : 'w-3 bg-border'
          }`}
        />
      ))}
    </div>
  )
}

// ─── 역할 선택 카드 ──────────────────────────────────────────
interface RoleCardProps {
  role: ActiveRole
  selected: boolean
  onToggle: () => void
  emoji: string
  title: string
  desc: string
}

function RoleCard({ role: _role, selected, onToggle, emoji, title, desc }: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        w-full text-left rounded-2xl border-2 p-4 transition-all
        active:scale-[0.98]
        ${selected
          ? 'border-brand-600 bg-brand-50 shadow-soft'
          : 'border-border bg-surface hover:border-brand-300'}
      `}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1">
          <p className={`font-semibold ${selected ? 'text-brand-700' : 'text-text-primary'}`}>
            {title}
          </p>
          <p className="text-sm text-text-secondary mt-0.5 leading-normal">{desc}</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
          selected ? 'border-brand-600 bg-brand-600' : 'border-border'
        }`}>
          {selected && <span className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
    </button>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────
export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // 역할 (둘 다 선택 가능)
  const [isBusiness, setIsBusiness] = useState(false)
  const [isWorker, setIsWorker] = useState(false)

  // 이름
  const [name, setName] = useState('')

  // 사업자 정보
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    business_name: '',
    registration_number: '',
    address: '',
  })

  // 용역자 정보
  const [workerInfo, setWorkerInfo] = useState<WorkerInfo>({
    birthdate: '',
    account_bank: '',
    account_number: '',
  })

  // 약관
  const [terms, setTerms] = useState<TermsState>({
    terms: false,
    privacy: false,
    location: false,
    matching: false,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)

  // 활성 역할 결정 (기본값: 먼저 선택된 것)
  const activeRole: ActiveRole = isBusiness ? 'business' : 'worker'

  // 전체 단계 수 계산
  const totalSteps = 4 // 역할, 이름, 추가정보, 약관

  function validateStep(): string | null {
    if (step === 0 && !isBusiness && !isWorker) {
      return '역할을 하나 이상 선택해주세요.'
    }
    if (step === 1 && !name.trim()) {
      return '이름을 입력해주세요.'
    }
    if (step === 2) {
      if (isBusiness && !businessInfo.business_name.trim()) {
        return '상호명을 입력해주세요.'
      }
      if (isBusiness && !businessInfo.registration_number.trim()) {
        return '사업자번호를 입력해주세요.'
      }
    }
    if (step === 3) {
      if (!terms.terms) return '이용약관에 동의해주세요.'
      if (!terms.privacy) return '개인정보처리방침에 동의해주세요.'
    }
    return null
  }

  function handleNext() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError(null)
    setStep(s => s + 1)
  }

  async function handleSubmit() {
    const err = validateStep()
    if (err) { setError(err); return }

    setIsLoading(true)
    setError(null)

    try {
      const body = {
        name: name.trim(),
        active_role: activeRole,
        is_business: isBusiness,
        is_worker: isWorker,
        ...(isBusiness
          ? {
              business: {
                business_name: businessInfo.business_name.trim(),
                registration_number: businessInfo.registration_number.trim() || null,
                address: businessInfo.address.trim() || null,
              },
            }
          : {}),
        ...(isWorker
          ? {
              worker: {
                birthdate: workerInfo.birthdate || null,
                account_bank: workerInfo.account_bank.trim() || null,
                account_number: workerInfo.account_number.trim() || null,
              },
            }
          : {}),
        terms: {
          terms: terms.terms,
          privacy: terms.privacy,
          location: terms.location,
          matching: terms.matching,
        },
      }

      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? '프로필 저장에 실패했습니다.')
        return
      }

      router.push('/business/home')
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  function toggleAllTerms(checked: boolean) {
    setTerms({ terms: checked, privacy: checked, location: checked, matching: checked })
  }

  const allTermsChecked =
    terms.terms && terms.privacy && terms.location && terms.matching

  const HELP_SECTIONS = [
    {
      title: '왜 이 정보가 필요한가요?',
      content: '서비스를 이용하려면 역할(사업자/용역자) 설정이 필요합니다. 역할에 따라 볼 수 있는 메뉴와 기능이 달라집니다.',
    },
    {
      title: '사업자 정보 (상호명·사업자번호)',
      content: '청소 일감 등록과 계산서 발행 시 사용됩니다. 나중에 설정 메뉴에서도 수정할 수 있어요.',
    },
    {
      title: '용역자 정보 (생년월일·계좌번호)',
      content: '일감 완료 후 정산 시 등록된 계좌로 입금됩니다. 입력하지 않아도 가입은 가능하지만, 정산을 받으려면 반드시 입력해야 합니다.',
    },
    {
      title: '약관 동의',
      content: '이용약관과 개인정보처리방침은 필수 동의 항목입니다. 위치정보 동의는 매칭 기능 사용 시 더 정확한 결과를 제공합니다.',
    },
  ]

  return (
    <div className="flex flex-col gap-6 py-8">
      {/* 도움말 배너 */}
      <HelpBanner label="프로필 설정 도움말" onClick={() => setHelpOpen(true)} />

      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="프로필 설정 도움말"
        sections={HELP_SECTIONS}
      />

      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-text-primary">프로필 설정</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {step === 0 && '어떤 역할로 사용하시나요?'}
          {step === 1 && '이름을 알려주세요.'}
          {step === 2 && '추가 정보를 입력해주세요.'}
          {step === 3 && '약관에 동의해주세요.'}
        </p>
      </div>

      <StepIndicator current={step} total={totalSteps} />

      {/* 단계별 폼 */}
      <Card>
        {/* 1단계: 역할 선택 */}
        {step === 0 && (
          <div className="flex flex-col gap-3">
            <HelpTip>
              두 역할 모두 선택할 수 있습니다. 사업자는 일감을 올리고, 용역자는 일감을 받습니다.
            </HelpTip>
            <RoleCard
              role="business"
              selected={isBusiness}
              onToggle={() => { setIsBusiness(v => !v); setError(null) }}
              emoji="🏢"
              title="사업자"
              desc="청소 일감을 등록하고 용역자를 구하는 업주"
            />
            <RoleCard
              role="worker"
              selected={isWorker}
              onToggle={() => { setIsWorker(v => !v); setError(null) }}
              emoji="🧹"
              title="용역자"
              desc="청소 일감을 찾아 수입을 올리는 작업자"
            />
            <p className="text-xs text-text-tertiary text-center mt-1">
              두 역할 모두 선택할 수 있습니다.
            </p>
          </div>
        )}

        {/* 2단계: 이름 */}
        {step === 1 && (
          <>
            <HelpTip className="mb-2">실명을 입력해주세요. 매칭 및 정산 시 본인 확인에 사용됩니다.</HelpTip>
            <Input
              label="이름"
              placeholder="홍길동"
              value={name}
              onChange={e => { setName(e.target.value); setError(null) }}
              autoFocus
              autoComplete="name"
              name="name"
            />
          </>
        )}

        {/* 3단계: 추가 정보 */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <HelpTip>
              사업자번호와 주소는 선택 항목입니다. 계좌번호는 정산 시 사용되며 언제든 설정에서 수정할 수 있습니다.
            </HelpTip>
            {isBusiness && (
              <>
                <Input
                  label="상호명"
                  placeholder="예) 홍길동 청소"
                  value={businessInfo.business_name}
                  onChange={e => {
                    setBusinessInfo(p => ({ ...p, business_name: e.target.value }))
                    setError(null)
                  }}
                  autoFocus
                  name="business_name"
                />
                <Input
                  label="사업자번호"
                  placeholder="000-00-00000"
                  value={businessInfo.registration_number}
                  onChange={e =>
                    setBusinessInfo(p => ({
                      ...p,
                      registration_number: e.target.value,
                    }))
                  }
                  name="registration_number"
                />
                <Input
                  label="주소 (선택)"
                  placeholder="사업장 주소"
                  value={businessInfo.address}
                  onChange={e =>
                    setBusinessInfo(p => ({ ...p, address: e.target.value }))
                  }
                  name="address"
                />
              </>
            )}
            {isWorker && (
              <>
                <Input
                  label={isBusiness ? '생년월일 (선택)' : '생년월일'}
                  type="date"
                  value={workerInfo.birthdate}
                  onChange={e => {
                    setWorkerInfo(p => ({ ...p, birthdate: e.target.value }))
                    setError(null)
                  }}
                  autoFocus={!isBusiness}
                  name="birthdate"
                />
                <Input
                  label="은행명 (선택)"
                  placeholder="예) 국민은행"
                  value={workerInfo.account_bank}
                  onChange={e =>
                    setWorkerInfo(p => ({ ...p, account_bank: e.target.value }))
                  }
                  name="account_bank"
                />
                <Input
                  label="계좌번호 (선택)"
                  placeholder="계좌번호 입력"
                  value={workerInfo.account_number}
                  onChange={e =>
                    setWorkerInfo(p => ({ ...p, account_number: e.target.value }))
                  }
                  name="account_number"
                />
              </>
            )}
          </div>
        )}

        {/* 4단계: 약관 동의 */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            {/* 전체 동의 */}
            <label className="flex items-center gap-3 cursor-pointer py-2 border-b border-border-subtle">
              <input
                type="checkbox"
                checked={allTermsChecked}
                onChange={e => toggleAllTerms(e.target.checked)}
                className="w-5 h-5 rounded accent-brand-600 cursor-pointer"
              />
              <span className="font-semibold text-text-primary">전체 동의</span>
            </label>

            {TERMS_ITEMS.map(item => (
              <label key={item.key} className="flex items-center gap-3 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={terms[item.key]}
                  onChange={e =>
                    setTerms(p => ({ ...p, [item.key]: e.target.checked }))
                  }
                  className="w-5 h-5 rounded accent-brand-600 cursor-pointer"
                />
                <span className="text-sm text-text-primary flex-1">
                  {item.label}
                  {item.required && (
                    <span className="text-state-danger ml-1">(필수)</span>
                  )}
                  {!item.required && (
                    <span className="text-text-tertiary ml-1">(선택)</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
      </Card>

      {/* 에러 */}
      {error && (
        <p className="text-center text-sm text-state-danger">{error}</p>
      )}

      {/* 버튼 영역 */}
      <div className="flex gap-3">
        {step > 0 && (
          <Button
            variant="secondary"
            fullWidth
            onClick={() => { setError(null); setStep(s => s - 1) }}
            disabled={isLoading}
          >
            이전
          </Button>
        )}

        {step < totalSteps - 1 ? (
          <Button fullWidth onClick={handleNext}>
            다음
          </Button>
        ) : (
          <Button
            fullWidth
            isLoading={isLoading}
            onClick={handleSubmit}
          >
            완료
          </Button>
        )}
      </div>
    </div>
  )
}
