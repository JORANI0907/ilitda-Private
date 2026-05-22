'use client'

import { useContext } from 'react'
import Link from 'next/link'
import { Crown } from 'lucide-react'
import { AuthContext } from '@/contexts/AuthContext'

export function DemoPlanFab() {
  const auth = useContext(AuthContext)
  const isGuest = !auth?.isLoading && !auth?.user

  if (!isGuest) return null

  return (
    <Link
      href="/business/settings/plan"
      className="fixed bottom-[76px] right-4 z-50 flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-full shadow-pop transition-all pl-3 pr-3.5 py-2.5"
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}
      aria-label="플랜 업그레이드"
    >
      <Crown size={15} className="shrink-0" />
      <span className="text-xs font-bold tracking-tight">플랜</span>
    </Link>
  )
}
