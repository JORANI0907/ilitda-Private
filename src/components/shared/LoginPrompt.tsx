'use client'

import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface LoginPromptProps {
  open: boolean
  onClose: () => void
  message?: string
}

export function LoginPrompt({
  open,
  onClose,
  message = '이 기능을 사용하려면 로그인이 필요합니다.',
}: LoginPromptProps) {
  const router = useRouter()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <LogIn size={18} className="text-brand-600" />
          로그인이 필요해요
        </span>
      }
      description={message}
      footer={
        <>
          <Button
            fullWidth
            onClick={() => { onClose(); router.push('/login') }}
          >
            로그인 하기
          </Button>
          <Button variant="ghost" fullWidth onClick={onClose}>
            나중에 할게요
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary leading-normal">
        일잇다에 가입하면 일정 관리, 인력 매칭, 정산까지 한 곳에서 처리할 수 있어요.
      </p>
    </Modal>
  )
}
