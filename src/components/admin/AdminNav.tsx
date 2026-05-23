'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavTab {
  label: string
  href: string
  exact?: boolean
}

const ADMIN_TABS: NavTab[] = [
  { label: '대시보드',   href: '/admin',           exact: true },
  { label: '계정 관리',  href: '/admin/accounts'  },
  { label: '입금 관리',  href: '/admin/payments'  },
  { label: '운영 정책',  href: '/admin/policy'    },
  { label: 'SMS 현황',  href: '/admin/sms-log'   },
  { label: '개발자 도구', href: '/admin/dev'       },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-surface border-b border-border-subtle">
      <div className="max-w-lg mx-auto md:max-w-5xl">
        <div className="flex overflow-x-auto scrollbar-hide px-4 gap-1">
          {ADMIN_TABS.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href)

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={[
                  'flex items-center shrink-0 px-4 h-11 text-sm transition-colors whitespace-nowrap',
                  isActive
                    ? 'text-brand-600 border-b-2 border-brand-600 font-semibold'
                    : 'text-text-secondary hover:text-text-primary',
                ].join(' ')}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
