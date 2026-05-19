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
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  const [monthSchedules, inProgressSchedules, workerCount, upcomingSchedules] = await Promise.all([
    service
      .from('schedules')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('service_date', monthStart)
      .lte('service_date', monthEnd)
      .is('deleted_at', null),

    service
      .from('schedules')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'in_progress')
      .is('deleted_at', null),

    service
      .from('assignments')
      .select('worker_id', { count: 'exact' })
      .in('schedule_id',
        (await service
          .from('schedules')
          .select('id')
          .eq('business_id', business.id)
          .is('deleted_at', null)
          .then(r => (r.data ?? []).map(s => s.id)))
      )
      .is('deleted_at', null),

    service
      .from('schedules')
      .select(`
        id, service_date, start_time, status, service_type,
        client:clients(name)
      `)
      .eq('business_id', business.id)
      .gte('service_date', today)
      .in('status', ['scheduled', 'in_progress'])
      .is('deleted_at', null)
      .order('service_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(5),
  ])

  // 중복 worker_id 제거
  const uniqueWorkers = new Set((workerCount.data ?? []).map((r: { worker_id: string }) => r.worker_id))

  return NextResponse.json({
    success: true,
    data: {
      businessName: business.business_name,
      monthScheduleCount: monthSchedules.count ?? 0,
      inProgressCount: inProgressSchedules.count ?? 0,
      workerCount: uniqueWorkers.size,
      upcomingSchedules: upcomingSchedules.data ?? [],
    },
  })
}
