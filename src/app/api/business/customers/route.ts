import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 50 } })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? ''
  const service_type = searchParams.get('service_type') ?? ''
  const favorites = searchParams.get('favorites') === '1'

  const service = createServiceClient()

  const { data: business, error: bizError } = await service
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (bizError || !business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  let query = service
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('business_id', business.id)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (q.trim()) {
    query = query.ilike('name', `%${q.trim()}%`)
  }
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (service_type && service_type !== 'all') {
    query = query.eq('service_type', service_type)
  }
  if (favorites) {
    query = query.eq('is_favorite', true)
  }

  const { data, error, count } = await query

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
    .maybeSingle()

  if (bizError || !business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const updates: Record<string, unknown> = { business_id: business.id }
  for (const key of CLIENT_ALLOWED) {
    if (key in b) updates[key] = b[key]
  }

  if (!updates.name) {
    return NextResponse.json({ success: false, error: '고객명은 필수입니다.' }, { status: 400 })
  }

  const { data, error } = await service
    .from('clients')
    .insert(updates)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}
