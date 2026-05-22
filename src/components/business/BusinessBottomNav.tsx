'use client'

import { useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, BarChart3, Users, Store, User, FileText,
} from 'lucide-react'
import { AuthContext } from '@/contexts/AuthContext'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const TABS: NavItem[] = [
  { href: '/business/home',              label: '홈',    icon: <Home size={22} /> },
  { href: '/business/applications',      label: '일정',  icon: <BarChart3 size={22} /> },
  { href: '/business/hr',                label: '운영',  icon: <Users size={22} /> },
  { href: '/business/market',            label: '마켓',  icon: <Store size={22} /> },
  { href: '/business/form-preview',      label: '신청서', icon: <FileText size={22} /> },
  { href: '/business/profile',           label: '프로필', icon: <User size={22} /> },
]

export function BusinessBottomNav() {
  const pathname = usePathname()
  const auth = useContext(AuthContext)
  const isGuest = !auth?.isLoading && !auth?.user

  const tabs = TABS.map(t =>
    t.href === '/business/profile' ? { ...t, href: isGuest ? '/login' : '/business/profile' } : t
  )

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
                  text-[10px] font-medium transition-colors relative
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
