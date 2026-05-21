import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const service = createServiceClient()

  const { data: business } = await service
    .from('businesses')
    .select('id, business_name')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const today      = now.toISOString().slice(0, 10)
  const tomorrow   = new Date(now.getTime() + 86400000).toISOString().slice(0, 10)

  const [monthApps, inventoryItems, todayRows, tomorrowRows] = await Promise.all([
    // 이번달 일정 + 작업자 배정 (service_applications 기반)
    service
      .from('service_applications')
      .select('id, assigned_connection_ids')
      .eq('business_id', business.id)
      .gte('construction_date', monthStart)
      .lte('construction_date', monthEnd)
      .not('construction_date', 'is', null)
      .neq('status', '예약취소'),

    // 재고 현황 (부족 판별은 JS에서)
    service
      .from('inventory')
      .select('current_qty, min_qty')
      .eq('business_id', business.id)
      .not('min_qty', 'is', null)
      .is('deleted_at', null),

    // 오늘 일정
    service
      .from('service_applications')
      .select('id, construction_date, construction_time, status, care_scope, business_name')
      .eq('business_id', business.id)
      .eq('construction_date', today)
      .not('construction_date', 'is', null)
      .neq('status', '예약취소')
      .order('construction_time', { ascending: true, nullsFirst: false }),

    // 내일 일정
    service
      .from('service_applications')
      .select('id, construction_date, construction_time, status, care_scope, business_name')
      .eq('business_id', business.id)
      .eq('construction_date', tomorrow)
      .not('construction_date', 'is', null)
      .neq('status', '예약취소')
      .order('construction_time', { ascending: true, nullsFirst: false }),
  ])

  const apps = (monthApps.data ?? []) as { id: string; assigned_connection_ids: string[] | null }[]
  const monthScheduleCount = apps.length
  const monthWorkerCount   = apps.reduce((sum, a) => sum + (a.assigned_connection_ids?.length ?? 0), 0)

  const lowStockCount = (inventoryItems.data ?? []).filter(
    (item: { current_qty: number | null; min_qty: number | null }) =>
      item.current_qty !== null && item.min_qty !== null && item.current_qty < item.min_qty
  ).length

  type AppRow = {
    id: string
    construction_date: string
    construction_time: string | null
    status: string
    care_scope: string | null
    business_name: string | null
  }

  function mapSchedule(s: AppRow) {
    return {
      id:           s.id,
      service_date: s.construction_date,
      start_time:   s.construction_time,
      status:       s.status,
      service_type: s.care_scope,
      client:       { name: s.business_name ?? '-' },
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      businessName:        business.business_name,
      monthScheduleCount,
      monthWorkerCount,
      lowStockCount,
      todaySchedules:    (todayRows.data    ?? []).map(s => mapSchedule(s as AppRow)),
      tomorrowSchedules: (tomorrowRows.data ?? []).map(s => mapSchedule(s as AppRow)),
    },
  })
}
