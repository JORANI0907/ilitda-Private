'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type PlanType = 'free' | 'basic' | 'pro' | 'max'

const PLAN_LABEL: Record<PlanType, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  max: 'Max',
}

const PLAN_STYLE: Record<PlanType, string> = {
  free: 'bg-surface-sunken text-text-tertiary border border-border',
  basic: 'bg-blue-100 text-blue-700',
  pro: 'bg-violet-100 text-violet-700',
  max: 'bg-amber-100 text-amber-700',
}

function isPlanType(value: string): value is PlanType {
  return ['free', 'basic', 'pro', 'max'].includes(value)
}

// fetch 없이 plan prop만으로 렌더링하는 순수 컴포넌트
interface PlanBadgeProps {
  plan: string
}

export function PlanBadge({ plan }: PlanBadgeProps) {
  const safePlan: PlanType = isPlanType(plan) ? plan : 'free'
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${PLAN_STYLE[safePlan]}`}
    >
      {PLAN_LABEL[safePlan]}
    </span>
  )
}

// 마운트 시 /api/business/plan 조회 후 플랜 뱃지 렌더링, 클릭 시 플랜 설정 페이지 이동
export function PlanChip() {
  const router = useRouter()
  const [plan, setPlan] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await fetch('/api/business/plan')
        if (!res.ok) return
        const json = await res.json() as { success: boolean; data?: { plan: string; plan_expires_at: string | null } }
        if (json.success && json.data) {
          setPlan(json.data.plan)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlan()
  }, [])

  if (isLoading) {
    return (
      <span className="w-12 h-5 bg-surface-sunken rounded-full animate-pulse inline-block" />
    )
  }

  if (!plan) return null

  const safePlan: PlanType = isPlanType(plan) ? plan : 'free'

  return (
    <button
      type="button"
      onClick={() => router.push('/business/settings/plan')}
      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${PLAN_STYLE[safePlan]}`}
    >
      {PLAN_LABEL[safePlan]}
    </button>
  )
}
