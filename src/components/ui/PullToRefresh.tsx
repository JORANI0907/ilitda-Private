'use client'

import { useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'

export function PullToRefresh() {
  const router = useRouter()
  const isRefreshing = useRef(false)

  const handleRefresh = useCallback(() => {
    if (isRefreshing.current) return
    isRefreshing.current = true
    router.refresh()
    setTimeout(() => {
      isRefreshing.current = false
    }, 1500)
  }, [router])

  const { indicatorRef } = usePullToRefresh({ onRefresh: handleRefresh })

  return (
    <div
      ref={indicatorRef}
      style={{
        transform: 'translateY(-48px)',
        opacity: 0,
        transition: 'transform 0.15s ease, opacity 0.15s ease',
      }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      aria-hidden="true"
    >
      <div className="mt-3 w-9 h-9 rounded-full bg-surface shadow-pop border border-border-subtle flex items-center justify-center">
        <RefreshCw
          size={16}
          className="text-text-secondary transition-transform"
          style={{ transition: 'transform 0.3s' }}
        />
      </div>
    </div>
  )
}
