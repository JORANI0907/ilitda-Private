import { ReactNode } from 'react'
import { BottomNav } from '@/components/ui/BottomNav'

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-sunken">
      <main className="max-w-lg mx-auto pb-20">
        {children}
      </main>
      <BottomNav role="business" />
    </div>
  )
}
