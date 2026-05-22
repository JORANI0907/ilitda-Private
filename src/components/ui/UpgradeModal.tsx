'use client'

import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { PLAN_NAMES, PLAN_PRICES, type PlanType } from '@/lib/plan-features'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  featureName: string
  requiredPlan: PlanType
  currentPlan?: PlanType
}

const PAID_PLANS: PlanType[] = ['basic', 'pro', 'max']

function formatPrice(price: number): string {
  if (price === 0) return '무료'
  return `${price.toLocaleString('ko-KR')}원/월`
}

export function UpgradeModal({
  open,
  onClose,
  featureName,
  requiredPlan,
  currentPlan = 'free',
}: UpgradeModalProps) {
  const router = useRouter()
  const requiredIdx = PAID_PLANS.indexOf(requiredPlan)

  function handlePlanClick() {
    onClose()
    router.push('/business/settings/plan')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex flex-col items-center gap-3 pt-2 pb-1 w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Lock size={28} className="text-amber-500" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-text-primary leading-snug break-keep">
              {featureName}
            </h2>
            <p className="text-sm text-text-secondary break-keep">
              {PLAN_NAMES[requiredPlan]} 이상에서 사용 가능합니다
            </p>
          </div>
        </div>
      }
      footer={
        <Button fullWidth variant="ghost" onClick={onClose}>
          닫기
        </Button>
      }
      showCloseButton={false}
    >
      <div className="flex flex-col gap-3 pt-1">
        {PAID_PLANS.map((plan, idx) => {
          const isCurrent = plan === currentPlan
          const isRequired = idx === requiredIdx
          const isAvailable = idx >= requiredIdx

          return (
            <div
              key={plan}
              onClick={handlePlanClick}
              className={`
                rounded-2xl border p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer active:scale-[0.98]
                ${isCurrent
                  ? 'bg-surface-sunken border-border text-text-secondary hover:bg-border/50'
                  : isRequired
                    ? 'bg-brand-600/5 border-brand-600 ring-1 ring-brand-600 hover:bg-brand-600/10'
                    : isAvailable
                      ? 'bg-surface border-border-subtle hover:bg-surface-sunken'
                      : 'bg-surface-sunken border-border opacity-60'}
              `}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold break-keep ${
                      isRequired ? 'text-brand-600' : isCurrent ? 'text-text-tertiary' : 'text-text-primary'
                    }`}
                  >
                    {PLAN_NAMES[plan]}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-medium text-text-tertiary bg-border px-1.5 py-0.5 rounded-full">
                      현재 플랜
                    </span>
                  )}
                  {isRequired && !isCurrent && (
                    <span className="text-[10px] font-medium text-white bg-brand-600 px-1.5 py-0.5 rounded-full">
                      추천
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs tabular-nums ${
                    isRequired ? 'text-brand-600 font-semibold' : 'text-text-tertiary'
                  }`}
                >
                  {formatPrice(PLAN_PRICES[plan])}
                </span>
              </div>

              <div className="shrink-0">
                {isAvailable && !isCurrent ? (
                  <div className="w-5 h-5 rounded-full bg-brand-600/10 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-brand-600" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-surface-sunken border border-border" />
                )}
              </div>
            </div>
          )
        })}

        <p className="text-xs text-text-tertiary text-center break-keep mt-1">
          플랜 카드를 탭하면 요금제 페이지로 이동합니다.
        </p>
      </div>
    </Modal>
  )
}
