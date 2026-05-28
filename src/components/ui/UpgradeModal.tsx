'use client'

import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { PlanType } from '@/lib/plan-features'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  featureName: string
  requiredPlan?: PlanType
  currentPlan?: PlanType
}

export function UpgradeModal({
  open,
  onClose,
}: UpgradeModalProps) {
  const router = useRouter()

  function handleUpgrade() {
    onClose()
    router.push('/business/settings/plan')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex flex-col items-center gap-3 pt-2 pb-1 w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Lock size={28} className="text-amber-500" />
          </div>
          <p className="text-base font-semibold text-text-primary break-keep">
            현재 플랜으로 기능을 사용할 수 없습니다.
          </p>
        </div>
      }
      footer={
        <div className="flex flex-col gap-2">
          <Button fullWidth onClick={handleUpgrade}>
            플랜 업그레이드 하기
          </Button>
          <Button fullWidth variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </div>
      }
      showCloseButton={false}
    >
      <div />
    </Modal>
  )
}
