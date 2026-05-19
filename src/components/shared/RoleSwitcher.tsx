'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { ActiveRole } from '@/types'

interface RoleSwitcherProps {
  open: boolean
  onClose: () => void
  currentRole: ActiveRole
  targetRole: ActiveRole
}

const ROLE_LABEL: Record<ActiveRole, string> = {
  business: '사업자',
  worker:   '용역자',
}

const ROLE_REDIRECT: Record<ActiveRole, string> = {
  business: '/business/home',
  worker:   '/worker/home',
}

export function RoleSwitcher({ open, onClose, currentRole, targetRole }: RoleSwitcherProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSwitch = async () => {
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole }),
      })

      const json = await res.json()
      if (!json.success) {
        setErrorMsg(json.error ?? '역할 전환에 실패했습니다.')
        return
      }

      onClose()
      router.push(ROLE_REDIRECT[targetRole])
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <ArrowLeftRight size={18} className="text-brand-600" />
          역할 전환
        </span>
      }
      description={`현재 ${ROLE_LABEL[currentRole]} 모드에서 ${ROLE_LABEL[targetRole]} 모드로 전환합니다.`}
      footer={
        <>
          <Button
            fullWidth
            isLoading={isLoading}
            onClick={handleSwitch}
          >
            {ROLE_LABEL[targetRole]}로 전환하기
          </Button>
          <Button variant="ghost" fullWidth onClick={onClose} disabled={isLoading}>
            취소
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between bg-surface-sunken rounded-xl p-3">
          <div>
            <p className="text-xs text-text-tertiary mb-0.5">현재 모드</p>
            <p className="font-semibold text-text-primary">{ROLE_LABEL[currentRole]}</p>
          </div>
          <ArrowLeftRight size={16} className="text-text-tertiary mx-3" />
          <div className="text-right">
            <p className="text-xs text-text-tertiary mb-0.5">전환할 모드</p>
            <p className="font-semibold text-brand-600">{ROLE_LABEL[targetRole]}</p>
          </div>
        </div>
        <p className="text-sm text-text-secondary leading-normal">
          전환 후 {ROLE_LABEL[targetRole]} 홈 화면으로 이동합니다.
          언제든지 프로필에서 다시 전환할 수 있습니다.
        </p>
        {errorMsg && (
          <p className="text-sm text-state-danger">{errorMsg}</p>
        )}
      </div>
    </Modal>
  )
}
