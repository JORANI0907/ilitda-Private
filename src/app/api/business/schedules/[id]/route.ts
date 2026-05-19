import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

const CLIENT_FIELDS = [
  'name', 'phone', 'address', 'owner_name', 'email', 'business_number', 'account_number',
  'elevator', 'parking', 'building_access', 'access_method', 'care_scope',
  'business_hours_start', 'business_hours_end',
] as const

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const service = createServiceClient()

  const { data, error } = await service
    .from('schedules')
    .select(`
      *,
      client:clients(
        id, name, phone, address, owner_name, email, business_number, account_number,
        elevator, parking, building_access, access_method, care_scope,
        business_hours_start, business_hours_end
      ),
      assignments(
        id, status, hourly_rate, attended_at, created_at,
        connection:connections(id, display_name, manual_phone),
        worker:workers(id, profile:profiles(name, phone)),
        attendance(id, checkin_at, checkout_at, total_minutes)
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 404 })
  }

  return NextResponse.json({ success: true, data })
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
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

  const ALLOWED = ['client_id', 'service_date', 'start_time', 'end_time', 'status', 'fee', 'notes'] as const
  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in b) updates[key] = b[key]
  }

  const service = createServiceClient()

  // client_info가 제공된 경우 연결된 고객 정보도 업데이트
  const client_info = b.client_info
  if (typeof client_info === 'object' && client_info !== null) {
    const ci = client_info as Record<string, unknown>
    const clientUpdates: Record<string, unknown> = {}
    for (const key of CLIENT_FIELDS) {
      if (key in ci) {
        const v = ci[key]
        clientUpdates[key] = (typeof v === 'string' && v.trim()) ? v.trim() : null
      }
    }

    if (Object.keys(clientUpdates).length > 0) {
      const { data: currentSchedule } = await service
        .from('schedules')
        .select('client_id')
        .eq('id', id)
        .single()

      if (currentSchedule?.client_id) {
        await service
          .from('clients')
          .update(clientUpdates)
          .eq('id', currentSchedule.client_id)
      }
    }
  }

  if (Object.keys(updates).length === 0 && !client_info) {
    return NextResponse.json({ success: false, error: '변경할 필드가 없습니다.' }, { status: 400 })
  }

  // 스케줄 필드 변경이 없어도 client_info만 업데이트하는 경우 성공 처리
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: true })
  }

  const { data, error } = await service
    .from('schedules')
    .update(updates)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const service = createServiceClient()

  const { error } = await service
    .from('schedules')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
