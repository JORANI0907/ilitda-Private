'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Home, Calendar, Wallet, User,
  BarChart3, Users, Briefcase, Store,
} from 'lucide-react'

type Role = 'business' | 'worker'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const BUSINESS_TABS: NavItem[] = [
  { href: '/business/home',    label: '홈',       icon: <Home size={18} /> },
  { href: '/business/ops',     label: '운영',     icon: <BarChart3 size={18} /> },
  { href: '/business/hr',      label: '인사·재무', icon: <Users size={18} /> },
  { href: '/business/market',  label: '마켓',     icon: <Store size={18} /> },
  { href: '/business/profile', label: '프로필',   icon: <User size={18} /> },
]

const WORKER_TABS: NavItem[] = [
  { href: '/worker/home',     label: '홈',      icon: <Home size={18} /> },
  { href: '/worker/schedule', label: '내 일정', icon: <Calendar size={18} /> },
  { href: '/worker/pay',      label: '정산',    icon: <Wallet size={18} /> },
  { href: '/worker/market',   label: '일감',    icon: <Briefcase size={18} /> },
  { href: '/worker/profile',  label: '프로필',  icon: <User size={18} /> },
]

interface TopNavProps {
  role: Role
}

export function TopNav({ role }: TopNavProps) {
  const pathname = usePathname()
  const tabs = role === 'business' ? BUSINESS_TABS : WORKER_TABS
  const profileHref = role === 'business' ? '/business/profile' : '/worker/profile'

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-surface border-b border-border-subtle h-16 hidden md:flex items-center">
      <div className="max-w-5xl mx-auto w-full px-6 flex items-center gap-8">
        {/* 로고 */}
        <Link href={`/${role}/home`} className="flex-shrink-0 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-brand-light flex-shrink-0">
            <Image
              src="/brand/logo-icon.png"
              alt="일잇다 앱 아이콘"
              width={36}
              height={36}
              className="w-full h-full object-cover object-top"
              priority
            />
          </div>
          <span className="text-lg font-bold text-brand-600 tracking-tight">일잇다</span>
          <span className="text-xs font-medium text-text-tertiary">
            {role === 'business' ? '사업자' : '작업자'}
          </span>
        </Link>

        {/* 탭 메뉴 */}
        <nav className="flex items-center gap-0.5 flex-1">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  flex items-center gap-1.5 px-3 h-10 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-brand-light text-brand-600'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken'}
                `}
              >
                {tab.icon}
                {tab.label}
              </Link>
            )
          })}
        </nav>

        {/* 프로필 아이콘 */}
        <Link
          href={profileHref}
          className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-light flex items-center justify-center text-brand-600 hover:bg-brand-600 hover:text-white transition-colors"
          aria-label="프로필"
        >
          <User size={18} />
        </Link>
      </div>
    </header>
  )
}
