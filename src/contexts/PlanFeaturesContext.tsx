'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { PlanType, PlanFeatureMap } from '@/lib/plan-features'

export type DynamicFeatures = Record<PlanType, PlanFeatureMap>

interface PlanFeaturesContextValue {
  features: DynamicFeatures | null
  isLoading: boolean
  reload: () => void
}

const PlanFeaturesContext = createContext<PlanFeaturesContextValue>({
  features: null,
  isLoading: true,
  reload: () => {},
})

export function PlanFeaturesProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<DynamicFeatures | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    fetch('/api/plan-features')
      .then(r => r.json())
      .then(json => {
        if (!cancelled && json.success) setFeatures(json.data as DynamicFeatures)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [tick])

  function reload() { setTick(t => t + 1) }

  return (
    <PlanFeaturesContext.Provider value={{ features, isLoading, reload }}>
      {children}
    </PlanFeaturesContext.Provider>
  )
}

export function usePlanFeatures() {
  return useContext(PlanFeaturesContext)
}
