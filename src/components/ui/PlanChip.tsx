'use client'

import { useContext } from 'react'
import { useRouter } from 'next/navigation'
import { AuthContext } from '@/contexts/AuthContext'

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

export function PlanChip() {
  const router = useRouter()
  const auth = useContext(AuthContext)

  if (auth?.isLoading) {
    return (
      <span className="w-12 h-5 bg-surface-sunken rounded-full animate-pulse inline-block" />
    )
  }

  const plan = auth?.business?.plan_type
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
