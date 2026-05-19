import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
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
