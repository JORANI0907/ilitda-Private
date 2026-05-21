'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CheckCircle, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { SectionHeader } from '@/components/ui/SectionHeader'

interface PlanInfo {
  plan: string
  plan_expires_at: string | null
}

type PlanKey = 'basic' | 'pro'

interface PlanOption {
  key: PlanKey
  name: string
  price: number
  features: string[]
  color: string
  border: string
  selectedBorder: string
  selectedBg: string
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    key: 'basic',
    name: 'Basic',
    price: 49000,
    features: ['SMS 발송 100건/월', '서비스 관리 무제한', '견적서·계약서 발행'],
    color: 'text-blue-600',
    border: 'border-border',
    selectedBorder: 'border-blue-500',
    selectedBg: 'bg-blue-50',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 99000,
    features: ['SMS 발송 200건/월', '모든 Basic 기능', '우선 지원'],
    color: 'text-violet-600',
    border: 'border-border',
    selectedBorder: 'border-violet-500',
    selectedBg: 'bg-violet-50',
  },
]

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
}

export default function PlanPage() {
  const router = useRouter()
  const [currentPlan, setCurrentPlan] = useState<PlanInfo | null>(null)
  const [isLoadingPlan, setIsLoadingPlan] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null)
  const [depositorName, setDepositorName] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/business/plan')
        const json = await res.json()
        if (json.success) {
          setCurrentPlan(json.data)
        }
      } catch {
        // 현재 플랜 로드 실패 시 무시
      } finally {
        setIsLoadingPlan(false)
      }
    }
    load()
  }, [])

  function handleSelectPlan(key: PlanKey) {
    setSelectedPlan(key)
    setShowPayment(true)
    setSubmitResult(null)
    setErrorMsg(null)
  }

  async function handleSubmit() {
    if (!selectedPlan || !depositorName.trim()) {
      setErrorMsg('입금자명을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/business/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_name: selectedPlan,
          depositor_name: depositorName.trim(),
        }),
      })
      const json = await res.json()

      if (!json.success) {
        setErrorMsg(json.error ?? '신청에 실패했습니다.')
        setSubmitResult('error')
        return
      }

      setSubmitResult('success')
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다.')
      setSubmitResult('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedPlanOption = PLAN_OPTIONS.find(p => p.key === selectedPlan)

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-24">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-sunken text-text-secondary hover:bg-border transition-colors shrink-0"
        >
          <ChevronLeft size={18} />
        </button>
        <SectionHeader title="플랜 관리" level="page" />
      </div>

      {/* 현재 플랜 */}
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary">현재 플랜</p>
            {isLoadingPlan ? (
              <div className="h-6 w-20 bg-surface-sunken rounded animate-pulse mt-1" />
            ) : (
              <p className="text-lg font-bold text-text-primary">
                {PLAN_LABEL[currentPlan?.plan ?? 'free'] ?? 'Free'}
              </p>
            )}
            {currentPlan?.plan_expires_at && currentPlan.plan !== 'free' && (
              <p className="text-xs text-text-tertiary mt-0.5">
                만료일: {currentPlan.plan_expires_at}
              </p>
            )}
          </div>
          <CreditCard size={24} className="text-text-tertiary" />
        </div>
      </Card>

      {/* 플랜 카드 */}
      {!submitResult && (
        <>
          <SectionHeader title="플랜 선택" level="section" />
          <div className="flex flex-col gap-3">
            {PLAN_OPTIONS.map(plan => (
              <button
                key={plan.key}
                type="button"
                onClick={() => handleSelectPlan(plan.key)}
                className={`
                  text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98]
                  ${selectedPlan === plan.key
                    ? `${plan.selectedBorder} ${plan.selectedBg} shadow-soft`
                    : `${plan.border} bg-surface hover:border-brand-200 hover:bg-brand-50/30 hover:shadow-card`
                  }
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className={`font-bold text-lg ${selectedPlan === plan.key ? plan.color : 'text-text-primary'}`}>
                    {plan.name}
                  </p>
                  <p className="font-bold text-text-primary">
                    ₩{plan.price.toLocaleString('ko-KR')}
                    <span className="text-sm font-normal text-text-secondary">/월</span>
                  </p>
                </div>
                <ul className="flex flex-col gap-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                      <CheckCircle size={13} className={plan.color} />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </>
      )}

      {/* 결제 안내 */}
      {showPayment && selectedPlanOption && !submitResult && (
        <Card padding="md">
          <div className="flex flex-col gap-4">
            <SectionHeader title="계좌이체 안내" level="section" />

            <div className="bg-surface-sunken rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">은행</span>
                <span className="font-medium text-text-primary">국민은행</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">계좌번호</span>
                <span className="font-medium text-text-primary">123-456-789012</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">예금주</span>
                <span className="font-medium text-text-primary">범빌드코리아</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-border-subtle pt-2 mt-1">
                <span className="text-text-secondary">입금 금액</span>
                <span className="font-bold text-text-primary">
                  ₩{selectedPlanOption.price.toLocaleString('ko-KR')}
                </span>
              </div>
            </div>

            <Input
              label="입금자명"
              placeholder="입금 시 사용한 이름"
              value={depositorName}
              onChange={e => { setDepositorName(e.target.value); setErrorMsg(null) }}
              autoFocus
              name="depositor_name"
            />

            {errorMsg && (
              <p className="text-sm text-state-danger">{errorMsg}</p>
            )}

            <Button
              fullWidth
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              신청하기
            </Button>
          </div>
        </Card>
      )}

      {/* 신청 완료 */}
      {submitResult === 'success' && (
        <Card padding="md">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle size={48} className="text-state-success" />
            <div>
              <p className="text-lg font-bold text-text-primary">신청이 완료되었습니다</p>
              <p className="text-sm text-text-secondary mt-1 break-keep leading-normal">
                입금 확인 후 관리자가 플랜을 활성화합니다.
                <br />
                영업일 기준 1일 이내 처리됩니다.
              </p>
            </div>
            <Button variant="secondary" onClick={() => router.push('/business/hr')}>
              운영 메뉴로 돌아가기
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
