import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

const DEMO_WORKERS = [
  { id: 'demo-worker-1', display_name: '김청소', manual_name: '김청소', manual_phone: '010-1111-1111', is_manual: true, status: 'accepted', profiles: null, invite_token: null, manual_account_bank: '국민은행', manual_account_number: '123-456-789012', manual_registration_number: null, manual_resident_number: null, manual_company_name: null },
  { id: 'demo-worker-2', display_name: '이세정', manual_name: '이세정', manual_phone: '010-2222-2222', is_manual: true, status: 'accepted', profiles: null, invite_token: null, manual_account_bank: '신한은행', manual_account_number: '234-567-890123', manual_registration_number: null, manual_resident_number: null, manual_company_name: null },
  { id: 'demo-worker-3', display_name: '박일꾼', manual_name: '박일꾼', manual_phone: '010-3333-3333', is_manual: true, status: 'accepted', profiles: null, invite_token: null, manual_account_bank: '하나은행', manual_account_number: '345-678-901234', manual_registration_number: null, manual_resident_number: null, manual_company_name: null },
]

async function getBusinessId(userId: string): Promise<string | null> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('businesses')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return data.id
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const demo = DEMO_WORKERS.find((w) => w.id === id) ?? DEMO_WORKERS[0]
    return NextResponse.json({ success: true, data: demo, isDemo: true })
  }

  const businessId = await getBusinessId(user.id)
  if (!businessId) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const service = createServiceClient()

  const { data, error } = await service
    .from('connections')
    .select('*, profiles!worker_profile_id(name, phone)')
    .eq('id', id)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ success: false, error: '작업자를 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data })
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const businessId = await getBusinessId(user.id)
  if (!businessId) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const ALLOWED = [
    'display_name',
    'manual_name',
    'manual_phone',
    'manual_account_bank',
    'manual_account_number',
    'manual_registration_number',
    'manual_resident_number',
    'manual_company_name',
  ]

  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in (body as Record<string, unknown>)) {
      const val = (body as Record<string, unknown>)[key]
      updates[key] = typeof val === 'string' ? (val.trim() || null) : val
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: '수정할 필드가 없습니다.' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const service = createServiceClient()

  const { error } = await service
    .from('connections')
    .update(updates)
    .eq('id', id)
    .eq('business_id', businessId)
    .is('deleted_at', null)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const businessId = await getBusinessId(user.id)
  if (!businessId) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const service = createServiceClient()

  const { error } = await service
    .from('connections')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('business_id', businessId)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
