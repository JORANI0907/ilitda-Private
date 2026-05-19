import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 50 } })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? 'current' // current | last

  const service = createServiceClient()

  const { data: business, error: bizError } = await service
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (bizError || !business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const now = new Date()
  let periodStart: Date
  let periodEnd: Date

  if (period === 'last') {
    periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    periodEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  }

  const { data, error, count } = await service
    .from('payrolls')
    .select(`
      *,
      worker:workers(
        id,
        profile:profiles(name, phone)
      )
    `, { count: 'exact' })
    .eq('business_id', business.id)
    .gte('period_start', periodStart.toISOString().slice(0, 10))
    .lte('period_end', periodEnd.toISOString().slice(0, 10))
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: data ?? [],
    meta: { total: count ?? 0, page: 1, limit: 50 },
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const service = createServiceClient()

  const { data: business, error: bizError } = await service
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (bizError || !business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const { period_start, period_end } = b

  if (!period_start || !period_end) {
    return NextResponse.json({ success: false, error: 'period_start, period_end는 필수입니다.' }, { status: 400 })
  }

  // 해당 기간 배정+출퇴근 기록 기반으로 급여 일괄 생성
  const { data: assignments, error: aError } = await service
    .from('assignments')
    .select(`
      id, worker_id, hourly_rate,
      schedule:schedules!inner(business_id, service_date),
      attendance(total_minutes)
    `)
    .eq('schedule.business_id', business.id)
    .gte('schedule.service_date', period_start as string)
    .lte('schedule.service_date', period_end as string)
    .eq('status', 'completed')
    .is('deleted_at', null)

  if (aError) {
    return NextResponse.json({ success: false, error: aError.message }, { status: 500 })
  }

  // 작업자별 집계
  const workerMap = new Map<string, { total_minutes: number; total_amount: number; hourly_rate: number }>()

  for (const a of (assignments ?? [])) {
    const existing = workerMap.get(a.worker_id) ?? { total_minutes: 0, total_amount: 0, hourly_rate: a.hourly_rate ?? 0 }
    const attendanceRows = a.attendance as Array<{ total_minutes: number | null }> | null
    const minutes = (attendanceRows ?? []).reduce((sum, att) => sum + (att.total_minutes ?? 0), 0)
    const amount = Math.round((minutes / 60) * (a.hourly_rate ?? 0))

    workerMap.set(a.worker_id, {
      total_minutes: existing.total_minutes + minutes,
      total_amount: existing.total_amount + amount,
      hourly_rate: a.hourly_rate ?? existing.hourly_rate,
    })
  }

  const inserts = Array.from(workerMap.entries()).map(([worker_id, v]) => ({
    worker_id,
    business_id: business.id,
    period_start,
    period_end,
    total_hours: v.total_minutes,
    total_amount: v.total_amount,
    status: 'pending',
  }))

  if (inserts.length === 0) {
    return NextResponse.json({ success: false, error: '해당 기간에 완료된 배정이 없습니다.' }, { status: 400 })
  }

  const { data, error } = await service
    .from('payrolls')
    .insert(inserts)
    .select()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const { id } = b

  if (!id) {
    return NextResponse.json({ success: false, error: 'id는 필수입니다.' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data, error } = await service
    .from('payrolls')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', id as string)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
