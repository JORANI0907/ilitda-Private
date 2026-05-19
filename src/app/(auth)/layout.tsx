import { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-sunken flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
