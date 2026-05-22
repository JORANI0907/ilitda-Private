'use client'

import { useState, useContext } from 'react'
import { AuthContext } from '@/contexts/AuthContext'
import { AuthPromptModal } from './AuthPromptModal'

interface GuestGuardProps {
  children: React.ReactNode
}

export function GuestGuard({ children }: GuestGuardProps) {
  const auth = useContext(AuthContext)
  const [showModal, setShowModal] = useState(false)

  const isGuest = !auth?.isLoading && !auth?.user

  if (!isGuest) return <>{children}</>

  return (
    <>
      <div
        onClickCapture={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowModal(true)
        }}
      >
        {children}
      </div>
      <AuthPromptModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  )
}
