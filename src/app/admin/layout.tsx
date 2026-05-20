import { ReactNode } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-dvh bg-surface-sunken">
        <main className="max-w-2xl mx-auto pb-8">
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
