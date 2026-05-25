'use client'

import { useEffect, useState } from 'react'
import { toPlanType, PLAN_FEATURES } from '@/lib/plan-features'
import type { PlanType, PlanFeatureMap } from '@/lib/plan-features'

interface UsePlanTypeReturn {
  planType: PlanType
  features: Record<PlanType, PlanFeatureMap>
  isLoading: boolean
}

/**
 * 현재 로그인된 사업자의 plan_type과 DB 기반 플랜 기능 설정을 반환하는 훅.
 * /api/auth/profile 응답의 business.plan_type 필드를 사용.
 * /api/plan-features 응답으로 동적 기능 설정을 받아오며, 실패 시 하드코딩된 값을 fallback으로 사용.
 */
export function usePlanType(): UsePlanTypeReturn {
  const [planType, setPlanType] = useState<PlanType>('free')
  const [features, setFeatures] = useState<Record<PlanType, PlanFeatureMap>>(PLAN_FEATURES)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetch('/api/auth/profile', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/plan-features', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([profileJson, featuresJson]) => {
        if (cancelled) return

        const raw = (profileJson.data?.business?.plan ?? profileJson.data?.business?.plan_type) as
          | string
          | null
          | undefined
        setPlanType(toPlanType(raw))

        if (featuresJson.success && featuresJson.data) {
          const featuresData = featuresJson.data?.features ?? featuresJson.data
          setFeatures(featuresData as Record<PlanType, PlanFeatureMap>)
        }
      })
      .catch(() => {
        // 오류 시 free 플랜 + 하드코딩 기본값 유지
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { planType, features, isLoading }
}
