import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') ?? 'all'

  // 미인증: 더미 데이터 반환
  if (!user) {
    return NextResponse.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 20 } })
  }

  // business_id 조회
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (bizError || !business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  let query = supabase
    .from('schedules')
    .select('*, client:clients(name)', { count: 'exact' })
    .eq('business_id', business.id)
    .is('deleted_at', null)
    .order('service_date', { ascending: true })

  const now = new Date()
  if (filter === 'today') {
    const today = now.toISOString().slice(0, 10)
    query = query.eq('service_date', today)
  } else if (filter === 'week') {
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    query = query
      .gte('service_date', start.toISOString().slice(0, 10))
      .lte('service_date', end.toISOString().slice(0, 10))
  } else if (filter === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    query = query
      .gte('service_date', start.toISOString().slice(0, 10))
      .lte('service_date', end.toISOString().slice(0, 10))
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: data ?? [],
    meta: { total: count ?? 0, page: 1, limit: 20 },
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { data: business, error: bizError } = await supabase
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

  const ALLOWED = ['client_id', 'service_date', 'start_time', 'end_time', 'fee', 'notes'] as const
  const updates: Record<string, unknown> = { business_id: business.id, status: 'scheduled' }
  for (const key of ALLOWED) {
    if (key in (body as Record<string, unknown>)) {
      updates[key] = (body as Record<string, unknown>)[key]
    }
  }

  if (!updates.service_date) {
    return NextResponse.json({ success: false, error: '일정 날짜는 필수입니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('schedules')
    .insert(updates)
    .select('*, client:clients(name)')
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}
