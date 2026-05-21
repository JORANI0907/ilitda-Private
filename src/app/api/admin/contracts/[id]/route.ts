import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ─── GET: 계약서 단건 조회 ───────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: biz } = await service.schema('ilitda').from('businesses')
    .select('id').eq('profile_id', user.id).maybeSingle()
  if (!biz) {
    return NextResponse.json({ error: '사업자 정보 없음' }, { status: 403 })
  }

  const { data, error } = await service.schema('ilitda')
    .from('contracts')
    .select(`
      *,
      service_applications(
        owner_name,
        business_name,
        phone,
        address
      )
    `)
    .eq('id', id)
    .eq('business_id', biz.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: '계약서를 찾을 수 없습니다' }, { status: 404 })
  }

  return NextResponse.json({ contract: data })
}

// ─── PUT: 수정 ───────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: biz } = await service.schema('ilitda').from('businesses')
    .select('id').eq('profile_id', user.id).maybeSingle()
  if (!biz) {
    return NextResponse.json({ error: '사업자 정보 없음' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  }

  const ALLOWED = [
    'signing_status', 'monthly_price', 'annual_price',
    'start_date', 'end_date', 'customer_phone',
    'selected_items', 'admin_signed_at',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: true })
  }

  updates.updated_at = new Date().toISOString()

  const { error } = await service.schema('ilitda')
    .from('contracts')
    .update(updates)
    .eq('id', id)
    .eq('business_id', biz.id)
    .is('deleted_at', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// ─── DELETE: soft delete ─────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: biz } = await service.schema('ilitda').from('businesses')
    .select('id').eq('profile_id', user.id).maybeSingle()
  if (!biz) {
    return NextResponse.json({ error: '사업자 정보 없음' }, { status: 403 })
  }

  const { error } = await service.schema('ilitda')
    .from('contracts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('business_id', biz.id)
    .is('deleted_at', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
