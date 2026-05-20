'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function PanelSettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[panel/error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 pt-20 text-center">
      <p className="text-lg font-semibold text-text-primary">페이지를 불러오지 못했습니다</p>
      <p className="text-sm text-text-secondary">{error.message}</p>
      {error.digest && (
        <p className="text-xs text-text-tertiary font-mono">digest: {error.digest}</p>
      )}
      <Button onClick={reset} variant="secondary">다시 시도</Button>
    </div>
  )
}
