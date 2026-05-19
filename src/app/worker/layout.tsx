import { ReactNode } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { TopNav } from '@/components/ui/TopNav'
import { BottomNav } from '@/components/ui/BottomNav'

export default function WorkerLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-dvh bg-surface-sunken">
        <TopNav role="worker" />
        <main className="max-w-lg mx-auto pb-20 md:max-w-5xl md:pb-8 md:pt-16 md:px-6">
          {children}
        </main>
        <div className="md:hidden">
          <BottomNav role="worker" />
        </div>
      </div>
    </AuthProvider>
  )
}
