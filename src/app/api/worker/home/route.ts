import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const service = createServiceClient()

  const { data: workerRow } = await service
    .from('workers')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  const { data: profile } = await service
    .from('profiles')
    .select('name, rating_avg, rating_count')
    .eq('id', user.id)
    .maybeSingle()

  if (!workerRow) {
    return NextResponse.json({
      success: true,
      data: {
        name: profile?.name ?? '',
        ratingAvg: profile?.rating_avg ?? 0,
        monthScheduleCount: 0,
        upcomingSchedules: [],
      },
    })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  const [monthCount, upcoming] = await Promise.all([
    service
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', workerRow.id)
      .is('deleted_at', null)
      .in('schedule_id',
        (await service
          .from('schedules')
          .select('id')
          .gte('service_date', monthStart)
          .lte('service_date', monthEnd)
          .is('deleted_at', null)
          .then(r => (r.data ?? []).map(s => s.id)))
      ),

    service
      .from('assignments')
      .select(`
        id, hourly_rate,
        schedule:schedules!inner(
          id, service_date, start_time, status, service_type,
          client:clients(name, address)
        )
      `)
      .eq('worker_id', workerRow.id)
      .is('deleted_at', null)
      .gte('schedule.service_date', today)
      .in('schedule.status', ['scheduled', 'in_progress'])
      .order('schedule(service_date)', { ascending: true })
      .limit(5),
  ])

  return NextResponse.json({
    success: true,
    data: {
      name: profile?.name ?? '',
      ratingAvg: profile?.rating_avg ?? 0,
      monthScheduleCount: monthCount.count ?? 0,
      upcomingSchedules: upcoming.data ?? [],
    },
  })
}
