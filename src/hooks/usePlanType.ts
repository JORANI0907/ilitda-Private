'use client'

import { useEffect, useState } from 'react'
import { toPlanType } from '@/lib/plan-features'
import type { PlanType } from '@/lib/plan-features'

interface UsePlanTypeReturn {
  planType: PlanType
  isLoading: boolean
}

/**
 * 현재 로그인된 사업자의 plan_type을 반환하는 훅.
 * /api/auth/profile 응답의 business.plan_type 필드를 사용.
 */
export function usePlanType(): UsePlanTypeReturn {
  const [planType, setPlanType] = useState<PlanType>('free')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetch('/api/auth/profile', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        const raw = (json.data?.business?.plan ?? json.data?.business?.plan_type) as string | null | undefined
        setPlanType(toPlanType(raw))
      })
      .catch(() => {
        // 오류 시 free 유지
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  return { planType, isLoading }
}
