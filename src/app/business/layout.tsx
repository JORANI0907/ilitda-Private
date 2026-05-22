import { ReactNode } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { TopNav } from '@/components/ui/TopNav'
import { BusinessBottomNav } from '@/components/business/BusinessBottomNav'
import { PullToRefresh } from '@/components/ui/PullToRefresh'

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-dvh bg-surface-sunken">
        <PullToRefresh />
        <TopNav role="business" />
        <main className="max-w-lg mx-auto pb-20 md:max-w-5xl md:pb-8 md:pt-16 md:px-6">
          {children}
        </main>
        <div className="md:hidden">
          <BusinessBottomNav />
        </div>
      </div>
    </AuthProvider>
  )
}
