'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useContext } from 'react'
import {
  Home, Calendar, Wallet,
  BarChart3, Users, Briefcase, Store, CreditCard,
} from 'lucide-react'
import { PlanChip } from '@/components/ui/PlanChip'
import { AuthContext } from '@/contexts/AuthContext'


type Role = 'business' | 'worker'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const BUSINESS_TABS: NavItem[] = [
  { href: '/business/home',         label: '홈',    icon: <Home size={18} /> },
  { href: '/business/applications', label: '일정',  icon: <BarChart3 size={18} /> },
  { href: '/business/hr',           label: '운영',  icon: <Users size={18} /> },
  { href: '/business/market',       label: '마켓',  icon: <Store size={18} /> },
  { href: '/business/settings/plan', label: '플랜', icon: <CreditCard size={18} /> },
]

const WORKER_TABS: NavItem[] = [
  { href: '/worker/home',     label: '홈',      icon: <Home size={18} /> },
  { href: '/worker/schedule', label: '내 일정', icon: <Calendar size={18} /> },
  { href: '/worker/pay',      label: '정산',    icon: <Wallet size={18} /> },
  { href: '/worker/market',   label: '일감',    icon: <Briefcase size={18} /> },
]

interface TopNavProps {
  role: Role
}

export function TopNav({ role }: TopNavProps) {
  const pathname = usePathname()
  const auth = useContext(AuthContext)
  const tabs = role === 'business' ? BUSINESS_TABS : WORKER_TABS
  const profileHref = role === 'business' ? '/business/profile' : '/worker/profile'
  const roleLabel = role === 'business' ? '사업자' : '작업자'
  const isProfileActive = pathname.startsWith(profileHref)
  const appDisplayName = auth?.business?.app_display_name ?? '일잇다'
  const isGuest = !auth?.isLoading && !auth?.user

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
          <span className="text-lg font-bold text-brand-600 tracking-tight">{appDisplayName}</span>
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

        {/* 역할 뱃지 + 프로필/설정 또는 로그인/회원가입 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isGuest && role === 'business' && <PlanChip />}
          {!isGuest && (
            <span className="text-xs font-medium text-text-tertiary px-2 py-1 bg-surface-sunken rounded-md">
              {roleLabel}
            </span>
          )}
          {isGuest ? (
            <div className="flex items-center gap-1">
              <Link
                href="/login"
                className="flex items-center px-3 h-10 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/login/register"
                className="flex items-center px-3 h-10 rounded-lg text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                회원가입
              </Link>
            </div>
          ) : (
            <Link
              href={profileHref}
              className={`
                flex items-center px-3 h-10 rounded-lg text-sm font-medium transition-colors
                ${isProfileActive
                  ? 'bg-brand-light text-brand-600'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken'}
              `}
            >
              프로필/설정
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
