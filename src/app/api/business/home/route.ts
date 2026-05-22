import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const DEMO_SCHEDULES_TODAY = () => {
  const today = new Date().toISOString().slice(0, 10)
  return [
    { id: 'demo-1', service_date: today, start_time: '10:00', status: '예약확정', service_type: '주방후드 청소', client: { name: '스타벅스 강남역점' } },
    { id: 'demo-2', service_date: today, start_time: '14:00', status: '서비스완료', service_type: '에어컨 청소', client: { name: '맥도날드 역삼점' } },
    { id: 'demo-3', service_date: today, start_time: '17:30', status: '예약확정', service_type: '바닥 청소', client: { name: '이디야 선릉점' } },
  ]
}

const DEMO_SCHEDULES_TOMORROW = () => {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  return [
    { id: 'demo-4', service_date: tomorrow, start_time: '09:00', status: '예약확정', service_type: '덕트 청소', client: { name: '버거킹 삼성점' } },
    { id: 'demo-5', service_date: tomorrow, start_time: '13:00', status: '예약확정', service_type: '식기세척기 청소', client: { name: '롯데리아 잠실점' } },
  ]
}

const DEMO_NEW_APPLICATIONS = () => {
  const now = new Date()
  return [
    { id: 'demo-new-1', business_name: '할리스커피 홍대점', care_scope: '에어컨 실내기 4대', created_at: new Date(now.getTime() - 1000 * 60 * 30).toISOString() },
    { id: 'demo-new-2', business_name: '파리바게뜨 신촌점', care_scope: '주방후드, 덕트 청소', created_at: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString() },
    { id: 'demo-new-3', business_name: '뚜레쥬르 종로점', care_scope: '바닥 왁스코팅', created_at: new Date(now.getTime() - 1000 * 60 * 60 * 5).toISOString() },
  ]
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({
      success: true,
      data: {
        businessName: '데모 사업장',
        monthScheduleCount: 8,
        monthWorkerCount: 15,
        lowStockCount: 2,
        isDemo: true,
        todaySchedules: DEMO_SCHEDULES_TODAY(),
        tomorrowSchedules: DEMO_SCHEDULES_TOMORROW(),
        newApplications: DEMO_NEW_APPLICATIONS(),
      },
    })
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

  const [monthApps, inventoryItems, todayRows, tomorrowRows, newApps] = await Promise.all([
    service
      .from('service_applications')
      .select('id, assigned_connection_ids')
      .eq('business_id', business.id)
      .gte('construction_date', monthStart)
      .lte('construction_date', monthEnd)
      .not('construction_date', 'is', null)
      .neq('status', '예약취소'),

    service
      .from('inventory')
      .select('current_qty, min_qty')
      .eq('business_id', business.id)
      .not('min_qty', 'is', null)
      .is('deleted_at', null),

    service
      .from('service_applications')
      .select('id, construction_date, construction_time, status, care_scope, business_name')
      .eq('business_id', business.id)
      .eq('construction_date', today)
      .not('construction_date', 'is', null)
      .neq('status', '예약취소')
      .order('construction_time', { ascending: true, nullsFirst: false }),

    service
      .from('service_applications')
      .select('id, construction_date, construction_time, status, care_scope, business_name')
      .eq('business_id', business.id)
      .eq('construction_date', tomorrow)
      .not('construction_date', 'is', null)
      .neq('status', '예약취소')
      .order('construction_time', { ascending: true, nullsFirst: false }),

    service
      .from('service_applications')
      .select('id, business_name, care_scope, created_at')
      .eq('business_id', business.id)
      .eq('status', '신규')
      .order('created_at', { ascending: false })
      .limit(5),
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
      todaySchedules:     (todayRows.data    ?? []).map(s => mapSchedule(s as AppRow)),
      tomorrowSchedules:  (tomorrowRows.data ?? []).map(s => mapSchedule(s as AppRow)),
      newApplications:    (newApps.data ?? []) as { id: string; business_name: string | null; care_scope: string | null; created_at: string }[],
    },
  })
}
