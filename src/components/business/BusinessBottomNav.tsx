'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, BarChart3, Users, Store, User, ClipboardList,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badgeKey?: 'requests'
}

const TABS: NavItem[] = [
  { href: '/business/home',         label: '홈',    icon: <Home size={22} /> },
  { href: '/admin/applications',    label: '운영',  icon: <BarChart3 size={22} /> },
  { href: '/business/ops/requests', label: '신청서', icon: <ClipboardList size={22} />, badgeKey: 'requests' },
  { href: '/business/hr',           label: '인사',  icon: <Users size={22} /> },
  { href: '/business/market',       label: '마켓',  icon: <Store size={22} /> },
  { href: '/business/profile',      label: '프로필', icon: <User size={22} /> },
]

export function BusinessBottomNav() {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch('/api/business/requests?status=pending')
        if (!res.ok) return
        const json = await res.json()
        if (json.success && json.meta?.pending_count !== undefined) {
          setPendingCount(json.meta.pending_count)
        }
      } catch {
        // 네트워크 오류 시 무시
      }
    }
    fetchPending()
  }, [])

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border-subtle"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex h-16">
        {TABS.map((tab) => {
          const isActive = tab.href === '/admin/applications'
            ? pathname.startsWith('/admin')
            : pathname.startsWith(tab.href)
          const showBadge = tab.badgeKey === 'requests' && pendingCount > 0
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`
                  flex flex-col items-center justify-center h-full gap-0.5
                  text-[10px] font-medium transition-colors relative
                  ${isActive
                    ? 'text-brand-600'
                    : 'text-text-tertiary hover:text-text-secondary'}
                `}
              >
                <span className={`relative ${isActive ? 'text-brand-600' : 'text-text-tertiary'}`}>
                  {tab.icon}
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 bg-state-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </span>
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
