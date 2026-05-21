import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

interface BusinessAccount {
  id: string
  business_name: string
  registration_number: string | null
  plan: string
  plan_expires_at: string | null
  created_at: string
  profile: {
    name: string
    phone: string
  } | null
}

async function checkAdmin(userId: string): Promise<boolean> {
  const service = createServiceClient()
  const { data } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle()
  return data?.is_admin === true
}

export async function GET(): Promise<NextResponse<ApiResponse<BusinessAccount[]>>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const isAdmin = await checkAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const service = createServiceClient()

  const { data: businesses, error } = await service
    .from('businesses')
    .select('id, business_name, registration_number, plan, plan_expires_at, created_at, profile_id')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const profileIds = (businesses ?? []).map(b => b.profile_id).filter(Boolean)

  const { data: profiles } = await service
    .from('profiles')
    .select('id, name, phone')
    .in('id', profileIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, { name: p.name, phone: p.phone }]))

  const result: BusinessAccount[] = (businesses ?? []).map(b => ({
    id: b.id,
    business_name: b.business_name,
    registration_number: b.registration_number,
    plan: b.plan ?? 'free',
    plan_expires_at: b.plan_expires_at ?? null,
    created_at: b.created_at,
    profile: profileMap.get(b.profile_id) ?? null,
  }))

  return NextResponse.json({ success: true, data: result })
}
