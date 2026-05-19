'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { CheckCircle2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface PageProps {
  params: Promise<{ token: string }>
}

interface InviteInfo {
  displayName: string
  businessName: string
}

export default function ConnectPage({ params }: PageProps) {
  const { token } = use(params)

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(`/api/connect/${token}`)
        const json = await res.json()
        if (!json.success) {
          setPageError(json.error ?? '유효하지 않은 초대 링크입니다.')
          return
        }
        setInfo(json.data)
      } catch {
        setPageError('페이지를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchInfo()
  }, [token])

  const handleAccept = async () => {
    setIsAccepting(true)
    setAcceptError(null)
    try {
      const res = await fetch(`/api/connect/${token}`, { method: 'POST' })
      const json = await res.json()
      if (!json.success) {
        if (res.status === 401) {
          setAcceptError('수락하려면 로그인이 필요합니다. 잠시 후 로그인 페이지로 이동합니다.')
          setTimeout(() => {
            window.location.href = `/login?redirect=/connect/${token}`
          }, 1500)
          return
        }
        setAcceptError(json.error ?? '수락 중 오류가 발생했습니다.')
        return
      }
      setIsDone(true)
    } catch {
      setAcceptError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsAccepting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-sunken">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-sunken px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-text-primary mb-2">초대를 불러올 수 없어요</p>
          <p className="text-sm text-text-secondary">{pageError}</p>
        </div>
      </div>
    )
  }

  if (isDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-sunken px-4">
        <div className="text-center flex flex-col items-center gap-4">
          <CheckCircle2 size={56} className="text-state-success" />
          <p className="text-xl font-bold text-text-primary">초대를 수락했습니다!</p>
          <p className="text-sm text-text-secondary break-keep">
            {info?.businessName}의 직원으로 등록되었습니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-sunken flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="bg-surface rounded-2xl shadow-soft border border-border-subtle p-6 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center">
            <UserCheck size={32} className="text-brand-600" />
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-xl font-bold text-text-primary break-keep">
              {info?.businessName}
            </p>
            <p className="text-sm text-text-secondary break-keep">
              에서 직원으로 초대했습니다
            </p>
          </div>

          <div className="w-full bg-surface-sunken rounded-xl p-3">
            <p className="text-xs text-text-tertiary mb-0.5">등록 이름</p>
            <p className="font-semibold text-text-primary">{info?.displayName}</p>
          </div>

          {acceptError && (
            <p className="text-sm text-state-danger break-keep">{acceptError}</p>
          )}

          <Button fullWidth onClick={handleAccept} isLoading={isAccepting}>
            수락하기
          </Button>

          <p className="text-xs text-text-tertiary break-keep">
            수락 시 해당 사업자의 일정 배정 대상에 포함됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}
