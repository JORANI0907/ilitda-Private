'use client'

import { useState } from 'react'
import { LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface CheckInButtonProps {
  assignmentId: string
  hasCheckedIn: boolean
  hasCheckedOut: boolean
  onSuccess?: (type: 'checkin' | 'checkout') => void
}

export function CheckInButton({
  assignmentId,
  hasCheckedIn,
  hasCheckedOut,
  onSuccess,
}: CheckInButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const getGps = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 },
      )
    })

  const handleCheckin = async (type: 'checkin' | 'checkout') => {
    setIsLoading(true)
    setErrorMsg(null)

    const gps = await getGps()

    try {
      const res = await fetch('/api/worker/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          type,
          lat: gps?.lat ?? null,
          lng: gps?.lng ?? null,
        }),
      })

      const json = await res.json()
      if (!json.success) {
        setErrorMsg(json.error ?? '처리 중 오류가 발생했습니다.')
        return
      }

      onSuccess?.(type)
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  if (hasCheckedOut) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-sm text-text-secondary">
        <LogOut size={16} className="text-state-success" />
        <span>퇴근 완료</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {!hasCheckedIn ? (
        <Button
          size="lg"
          fullWidth
          isLoading={isLoading}
          onClick={() => handleCheckin('checkin')}
          className="bg-state-success hover:bg-green-700 active:bg-green-700 text-white"
        >
          <LogIn size={20} />
          출근 체크인
        </Button>
      ) : (
        <Button
          size="lg"
          fullWidth
          isLoading={isLoading}
          onClick={() => handleCheckin('checkout')}
          variant="secondary"
        >
          <LogOut size={20} />
          퇴근 체크아웃
        </Button>
      )}
      {errorMsg && (
        <p className="text-xs text-state-danger text-center">{errorMsg}</p>
      )}
      {!hasCheckedIn && (
        <p className="text-xs text-text-tertiary text-center">
          GPS 정보가 함께 기록됩니다. 위치 권한을 허용해 주세요.
        </p>
      )}
    </div>
  )
}
