import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

interface PlanDistribution {
  free: number
  basic: number
  pro: number
  max: number
}

interface RecentSignup {
  id: string
  business_name: string
  plan_type: string
  created_at: string
}

interface SmsUsageItem {
  id: string
  business_name: string
  plan_type: string
  daily_sms_count: number
  daily_sms_reset_date: string | null
}

interface StatsData {
  planDistribution: PlanDistribution
  recentSignups: RecentSignup[]
  smsUsage: SmsUsageItem[]
  totalApplications: number
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

export async function GET(): Promise<NextResponse<ApiResponse<StatsData>>> {
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

  const [businessesResult, appsResult] = await Promise.all([
    service
      .from('businesses')
      .select('id, business_name, plan_type, created_at, daily_sms_count, daily_sms_reset_date'),
    service
      .from('service_applications')
      .select('id', { count: 'exact', head: true }),
  ])

  if (businessesResult.error) {
    return NextResponse.json(
      { success: false, error: businessesResult.error.message },
      { status: 500 }
    )
  }

  const businesses = businessesResult.data ?? []

  const planDistribution: PlanDistribution = { free: 0, basic: 0, pro: 0, max: 0 }
  for (const b of businesses) {
    const pt = (b.plan_type ?? 'free') as keyof PlanDistribution
    if (pt in planDistribution) {
      planDistribution[pt] += 1
    } else {
      planDistribution.free += 1
    }
  }

  const sorted = [...businesses].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const recentSignups: RecentSignup[] = sorted.slice(0, 5).map(b => ({
    id: b.id,
    business_name: b.business_name,
    plan_type: b.plan_type ?? 'free',
    created_at: b.created_at,
  }))

  const smsUsage: SmsUsageItem[] = businesses.map(b => ({
    id: b.id,
    business_name: b.business_name,
    plan_type: b.plan_type ?? 'free',
    daily_sms_count: b.daily_sms_count ?? 0,
    daily_sms_reset_date: b.daily_sms_reset_date ?? null,
  }))

  const totalApplications = appsResult.count ?? 0

  return NextResponse.json({
    success: true,
    data: { planDistribution, recentSignups, smsUsage, totalApplications },
  })
}
