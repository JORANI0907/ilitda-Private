'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Button } from './Button'

interface AuthPromptModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthPromptModal({ isOpen, onClose }: AuthPromptModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  function goLogin() {
    onClose()
    router.push('/login')
  }

  function goRegister() {
    onClose()
    router.push('/login/register')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface rounded-t-3xl md:rounded-2xl p-6 w-full max-w-sm mx-auto shadow-modal">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-surface-sunken text-text-secondary"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6 mt-2">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">일</span>
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">로그인이 필요해요</h2>
          <p className="text-sm text-text-secondary leading-normal break-keep">
            일잇다의 모든 기능을 사용하려면<br />로그인 또는 회원가입이 필요합니다.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button fullWidth onClick={goLogin}>
            로그인
          </Button>
          <Button variant="secondary" fullWidth onClick={goRegister}>
            회원가입
          </Button>
        </div>
      </div>
    </div>
  )
}
