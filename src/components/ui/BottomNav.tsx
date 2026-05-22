'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useContext } from 'react'
import {
  Home, Calendar, Wallet, ShoppingBag, User,
  BarChart3, Users, Briefcase, Store,
} from 'lucide-react'
import { AuthContext } from '@/contexts/AuthContext'

type Role = 'business' | 'worker'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const BUSINESS_TABS: NavItem[] = [
  { href: '/business/home',    label: '홈',      icon: <Home size={22} /> },
  { href: '/business/ops',     label: '운영',    icon: <BarChart3 size={22} /> },
  { href: '/business/hr',      label: '인사·재무', icon: <Users size={22} /> },
  { href: '/business/market',  label: '마켓',    icon: <Store size={22} /> },
  { href: '/business/profile', label: '프로필',  icon: <User size={22} /> },
]

const WORKER_TABS: NavItem[] = [
  { href: '/worker/home',     label: '홈',      icon: <Home size={22} /> },
  { href: '/worker/schedule', label: '내 일정', icon: <Calendar size={22} /> },
  { href: '/worker/pay',      label: '정산',    icon: <Wallet size={22} /> },
  { href: '/worker/market',   label: '일감',    icon: <Briefcase size={22} /> },
  { href: '/worker/profile',  label: '프로필',  icon: <User size={22} /> },
]

interface BottomNavProps {
  role: Role
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname()
  const auth = useContext(AuthContext)
  const isGuest = !auth?.isLoading && !auth?.user
  const profileHref = isGuest ? '/login' : `/${role}/profile`
  const baseTabs = role === 'business' ? BUSINESS_TABS : WORKER_TABS
  const tabs = baseTabs.map(t => t.href.endsWith('/profile') ? { ...t, href: profileHref } : t)

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border-subtle"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex h-16">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`
                  flex flex-col items-center justify-center h-full gap-0.5
                  text-[10px] font-medium transition-colors
                  ${isActive
                    ? 'text-brand-600'
                    : 'text-text-tertiary hover:text-text-secondary'}
                `}
              >
                <span className={isActive ? 'text-brand-600' : 'text-text-tertiary'}>
                  {tab.icon}
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
