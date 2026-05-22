import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const DEMO_ATTENDANCE = () => {
  const today = new Date().toISOString().slice(0, 10)
  return [
    {
      id: 'demo-att-1',
      checkin_at:    `${today}T08:30:00+09:00`,
      checkout_at:   `${today}T17:00:00+09:00`,
      total_minutes: 510,
      assignment: {
        id: 'demo-assign-1',
        schedule: { service_date: today, business_id: 'demo-biz' },
        worker: { id: 'demo-worker-1', profile: { name: '김청소' } },
      },
    },
    {
      id: 'demo-att-2',
      checkin_at:    `${today}T09:00:00+09:00`,
      checkout_at:   null,
      total_minutes: null,
      assignment: {
        id: 'demo-assign-2',
        schedule: { service_date: today, business_id: 'demo-biz' },
        worker: { id: 'demo-worker-2', profile: { name: '이세정' } },
      },
    },
    {
      id: 'demo-att-3',
      checkin_at:    null,
      checkout_at:   null,
      total_minutes: null,
      assignment: {
        id: 'demo-assign-3',
        schedule: { service_date: today, business_id: 'demo-biz' },
        worker: { id: 'demo-worker-3', profile: { name: '박일꾼' } },
      },
    },
  ]
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: true, data: DEMO_ATTENDANCE(), isDemo: true })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)

  const service = createServiceClient()

  const { data: business } = await service
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { data, error } = await service
    .from('attendance')
    .select(`
      id, checkin_at, checkout_at, total_minutes,
      assignment:assignments(
        id,
        schedule:schedules!inner(service_date, business_id),
        worker:workers(
          id,
          profile:profiles(name)
        )
      )
    `)
    .eq('assignment.schedule.business_id', business.id)
    .eq('assignment.schedule.service_date', date)
    .order('checkin_at', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [] })
}
