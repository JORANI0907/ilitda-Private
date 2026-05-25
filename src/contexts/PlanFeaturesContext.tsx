'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { PlanType, PlanFeatureMap } from '@/lib/plan-features'
import type { FeatureMeta } from '@/app/api/plan-features/route'

export type { FeatureMeta }
export type DynamicFeatures = Record<PlanType, PlanFeatureMap>

interface PlanFeaturesContextValue {
  features: DynamicFeatures | null
  meta: FeatureMeta[]
  isLoading: boolean
  reload: () => void
}

const PlanFeaturesContext = createContext<PlanFeaturesContextValue>({
  features: null,
  meta: [],
  isLoading: true,
  reload: () => {},
})

export function PlanFeaturesProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<DynamicFeatures | null>(null)
  const [meta, setMeta]         = useState<FeatureMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    fetch('/api/plan-features')
      .then(r => r.json())
      .then(json => {
        if (!cancelled && json.success) {
          setFeatures(json.data?.features ?? null)
          setMeta(json.data?.meta ?? [])
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [tick])

  function reload() { setTick(t => t + 1) }

  return (
    <PlanFeaturesContext.Provider value={{ features, meta, isLoading, reload }}>
      {children}
    </PlanFeaturesContext.Provider>
  )
}

export function usePlanFeatures() {
  return useContext(PlanFeaturesContext)
}
