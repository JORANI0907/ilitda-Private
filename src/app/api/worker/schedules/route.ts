import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') ?? 'all'

  if (!user) {
    return NextResponse.json({
      success: true,
      data: [],
      meta: { total: 0, page: 1, limit: 50 },
    })
  }

  // worker_id 조회
  const { data: worker, error: workerError } = await supabase
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

  // 날짜 범위 계산
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  let fromDate: string | null = null
  let toDate: string | null = null

  if (filter === 'this_week') {
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    fromDate = monday.toISOString().slice(0, 10)
    toDate = sunday.toISOString().slice(0, 10)
  } else if (filter === 'next_week') {
    const dayOfWeek = now.getDay()
    const nextMonday = new Date(now)
    nextMonday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? 1 : 8))
    const nextSunday = new Date(nextMonday)
    nextSunday.setDate(nextMonday.getDate() + 6)
    fromDate = nextMonday.toISOString().slice(0, 10)
    toDate = nextSunday.toISOString().slice(0, 10)
  }

  let query = supabase
    .from('assignments')
    .select(
      `
      id,
      status,
      hourly_rate,
      schedule:schedules(
        id,
        service_date,
        start_time,
        end_time,
        notes,
        status,
        client:clients(id, name, address)
      )
    `,
      { count: 'exact' },
    )
    .eq('worker_id', worker.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (fromDate && toDate) {
    // assignments → schedules.service_date 필터는 관계 필터로 처리
    query = query
      .gte('schedules.service_date', fromDate)
      .lte('schedules.service_date', toDate)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // 오늘 날짜를 클라이언트가 알 수 있도록 포함
  return NextResponse.json({
    success: true,
    data: data ?? [],
    meta: { total: count ?? 0, page: 1, limit: 50, today: todayStr },
  })
}
