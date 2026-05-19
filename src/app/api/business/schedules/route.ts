import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const CLIENT_FIELDS = [
  'name', 'phone', 'address', 'owner_name', 'email', 'business_number', 'account_number',
  'elevator', 'parking', 'building_access', 'access_method', 'care_scope',
  'business_hours_start', 'business_hours_end',
] as const

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') ?? 'all'

  // 미인증: 빈 목록 반환
  if (!user) {
    return NextResponse.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 20 } })
  }

  const service = createServiceClient()

  // business_id 조회
  const { data: business, error: bizError } = await service
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (bizError || !business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const now = new Date()

  // unassigned/assigned/favorites 는 assignments JOIN이 필요하거나 client.is_favorite 필터 필요
  if (filter === 'unassigned' || filter === 'assigned') {
    // assignments가 있는/없는 schedule_id 목록 조회
    const { data: assignedIds } = await service
      .from('assignments')
      .select('schedule_id')
      .is('deleted_at', null)

    const assignedSet = new Set((assignedIds ?? []).map((a: { schedule_id: string }) => a.schedule_id))

    const { data: allSchedules, error: allError } = await service
      .from('schedules')
      .select('*, client:clients(name, is_favorite)')
      .eq('business_id', business.id)
      .is('deleted_at', null)
      .order('service_date', { ascending: true })

    if (allError) {
      return NextResponse.json({ success: false, error: allError.message }, { status: 500 })
    }

    const filtered = (allSchedules ?? []).filter((s: { id: string }) =>
      filter === 'unassigned' ? !assignedSet.has(s.id) : assignedSet.has(s.id)
    )

    return NextResponse.json({
      success: true,
      data: filtered,
      meta: { total: filtered.length, page: 1, limit: 20 },
    })
  }

  if (filter === 'favorites') {
    const { data: favSchedules, error: favError } = await service
      .from('schedules')
      .select('*, client:clients(name, is_favorite)')
      .eq('business_id', business.id)
      .is('deleted_at', null)
      .order('service_date', { ascending: true })

    if (favError) {
      return NextResponse.json({ success: false, error: favError.message }, { status: 500 })
    }

    const filtered = (favSchedules ?? []).filter(
      (s: { client?: { is_favorite?: boolean } | null }) => s.client?.is_favorite === true
    )

    return NextResponse.json({
      success: true,
      data: filtered,
      meta: { total: filtered.length, page: 1, limit: 20 },
    })
  }

  let query = service
    .from('schedules')
    .select('*, client:clients(name, is_favorite)', { count: 'exact' })
    .eq('business_id', business.id)
    .is('deleted_at', null)
    .order('service_date', { ascending: true })

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

  const SCHEDULE_ALLOWED = ['client_id', 'service_date', 'start_time', 'end_time', 'fee', 'notes'] as const
  const updates: Record<string, unknown> = { business_id: business.id, status: 'scheduled' }
  for (const key of SCHEDULE_ALLOWED) {
    if (key in b) updates[key] = b[key]
  }

  if (!updates.service_date) {
    return NextResponse.json({ success: false, error: '일정 날짜는 필수입니다.' }, { status: 400 })
  }

  // client_info가 제공된 경우 새 고객을 먼저 생성
  const client_info = b.client_info
  if (
    typeof client_info === 'object' && client_info !== null
    && !updates.client_id
  ) {
    const ci = client_info as Record<string, unknown>
    const clientName = typeof ci.name === 'string' ? ci.name.trim() : ''
    if (clientName) {
      const clientData: Record<string, unknown> = { business_id: business.id }
      for (const key of CLIENT_FIELDS) {
        if (key in ci) {
          const v = ci[key]
          clientData[key] = (typeof v === 'string' && v.trim()) ? v.trim() : null
        }
      }

      const { data: newClient, error: clientError } = await service
        .from('clients')
        .insert(clientData)
        .select('id')
        .single()

      if (clientError) {
        return NextResponse.json({ success: false, error: clientError.message }, { status: 500 })
      }

      updates.client_id = newClient.id
    }
  }

  const { data, error } = await service
    .from('schedules')
    .insert(updates)
    .select('*, client:clients(name)')
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}
