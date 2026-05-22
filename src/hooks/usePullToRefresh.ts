'use client'

import { useEffect, useRef, useCallback } from 'react'

interface Options {
  onRefresh: () => void
  threshold?: number
  enabled?: boolean
}

export function usePullToRefresh({ onRefresh, threshold = 70, enabled = true }: Options) {
  const startYRef = useRef<number | null>(null)
  const pullDistRef = useRef(0)
  const isPullingRef = useRef(false)
  const indicatorRef = useRef<HTMLDivElement | null>(null)

  const setIndicatorProgress = useCallback((dist: number) => {
    const el = indicatorRef.current
    if (!el) return
    const progress = Math.min(dist / threshold, 1)
    const translateY = Math.min(dist * 0.4, threshold * 0.4)
    el.style.transform = `translateY(${translateY}px)`
    el.style.opacity = String(progress)
    el.setAttribute('data-ready', progress >= 1 ? 'true' : 'false')
  }, [threshold])

  const resetIndicator = useCallback(() => {
    const el = indicatorRef.current
    if (!el) return
    el.style.transform = 'translateY(-48px)'
    el.style.opacity = '0'
    el.setAttribute('data-ready', 'false')
  }, [])

  useEffect(() => {
    if (!enabled) return

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return
      startYRef.current = e.touches[0].clientY
      pullDistRef.current = 0
      isPullingRef.current = false
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null) return
      if (window.scrollY > 0) {
        startYRef.current = null
        resetIndicator()
        return
      }
      const dy = e.touches[0].clientY - startYRef.current
      if (dy <= 0) return

      isPullingRef.current = true
      pullDistRef.current = dy
      setIndicatorProgress(dy)

      // 임계값 초과 시 스크롤 방지 (iOS bounce 제어)
      if (dy > 8) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = () => {
      if (!isPullingRef.current) return
      const dist = pullDistRef.current
      startYRef.current = null
      pullDistRef.current = 0
      isPullingRef.current = false
      resetIndicator()

      if (dist >= threshold) {
        onRefresh()
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, threshold, onRefresh, setIndicatorProgress, resetIndicator])

  return { indicatorRef }
}
