import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

const CLIENT_ALLOWED = [
  'name', 'phone', 'address', 'type', 'service_type', 'notes', 'is_favorite',
  'owner_name', 'email', 'business_number', 'account_number',
  'elevator', 'parking', 'building_access', 'access_method', 'care_scope',
  'door_password', 'business_hours_start', 'business_hours_end',
  'visit_interval_days', 'next_visit_date',
  'unit_price', 'billing_cycle', 'payment_method',
  'deposit', 'supply_amount', 'vat', 'balance',
  'status', 'contract_start_date', 'contract_end_date',
  'disposition', 'admin_notes',
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
    .from('clients')
    .select(`
      *,
      schedules(
        id, service_date, start_time, end_time, status, fee, notes, service_type,
        assignments(id, status, connection:connections(display_name))
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .order('service_date', { ascending: false, referencedTable: 'schedules' })
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
  const updates: Record<string, unknown> = {}
  for (const key of CLIENT_ALLOWED) {
    if (key in b) updates[key] = b[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: '변경할 필드가 없습니다.' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data, error } = await service
    .from('clients')
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
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
