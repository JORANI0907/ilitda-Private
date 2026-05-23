import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/ui/TopNav'
import { BusinessBottomNav } from '@/components/business/BusinessBottomNav'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    redirect('/business/applications')
  }

  return (
    <div className="min-h-dvh bg-surface-sunken">
      <TopNav role="business" />
      <AdminNav />
      <main className="max-w-lg mx-auto pb-20 md:max-w-5xl md:pb-8 md:pt-16 md:px-6">
        {children}
      </main>
      <div className="md:hidden">
        <BusinessBottomNav />
      </div>
    </div>
  )
}
