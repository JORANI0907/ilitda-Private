import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 20 } })
  }

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') ?? 'current' // 'current' | 'history'

  const service = createServiceClient()

  const { data: worker, error: workerError } = await service
    .from('workers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (workerError || !worker) {
    return NextResponse.json(
      { success: false, error: '용역자 정보를 찾을 수 없습니다.' },
      { status: 404 },
    )
  }

  if (mode === 'current') {
    // 이번달 배정 + 출퇴근 기록으로 예상 급여 계산
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

    const { data, error } = await service
      .from('assignments')
      .select(
        `
        id,
        hourly_rate,
        status,
        schedule:schedules(service_date, start_time, end_time, client:clients(name)),
        attendance(total_minutes, checkin_at, checkout_at)
      `,
      )
      .eq('worker_id', worker.id)
      .is('deleted_at', null)
      .gte('schedules.service_date', monthStart)
      .lte('schedules.service_date', monthEnd)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
      meta: { total: (data ?? []).length, page: 1, limit: 50 },
    })
  }

  // history: 과거 월별 payroll 요약
  const { data, error, count } = await service
    .from('payrolls')
    .select('*', { count: 'exact' })
    .eq('worker_id', worker.id)
    .order('period_start', { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: data ?? [],
    meta: { total: count ?? 0, page: 1, limit: 20 },
  })
}
