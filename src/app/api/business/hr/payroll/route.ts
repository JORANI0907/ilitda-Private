import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

// GET: 내 business_id의 service_applications 중 assigned_connection_ids가 있는 것 목록
export async function GET(_request: NextRequest) {
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

  // service_applications with assigned workers
  const { data: applications, error: appsError } = await service
    .from('service_applications')
    .select('id, construction_date, business_name, care_scope, worker_pay, assigned_connection_ids')
    .eq('business_id', businessId)
    .not('assigned_connection_ids', 'is', null)
    .order('construction_date', { ascending: false })

  if (appsError) {
    return NextResponse.json({ success: false, error: appsError.message }, { status: 500 })
  }

  if (!applications || applications.length === 0) {
    return NextResponse.json({ success: true, data: [] })
  }

  // Collect all connection IDs across all applications
  const allConnectionIds = Array.from(
    new Set(
      (applications as Array<{ assigned_connection_ids: string[] | null }>)
        .flatMap((a) => a.assigned_connection_ids ?? [])
    )
  )

  let connectionsMap: Record<string, string> = {}

  if (allConnectionIds.length > 0) {
    const { data: connections } = await service
      .from('connections')
      .select('id, display_name')
      .in('id', allConnectionIds)
      .is('deleted_at', null)

    if (connections) {
      connectionsMap = Object.fromEntries(
        (connections as Array<{ id: string; display_name: string }>)
          .map((c) => [c.id, c.display_name])
      )
    }
  }

  // Attach worker names to each application
  const enriched = (applications as Array<{
    id: string
    construction_date: string | null
    business_name: string
    care_scope: string | null
    worker_pay: Record<string, number> | null
    assigned_connection_ids: string[] | null
  }>).map((app) => ({
    ...app,
    workers: (app.assigned_connection_ids ?? []).map((cid) => ({
      connection_id: cid,
      display_name: connectionsMap[cid] ?? '알 수 없음',
    })),
  }))

  return NextResponse.json({ success: true, data: enriched })
}

// PUT: worker_pay jsonb 업데이트 (단건)
export async function PUT(request: NextRequest) {
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

  const { application_id, connection_id, amount } = body as Record<string, unknown>

  if (!application_id || typeof application_id !== 'string') {
    return NextResponse.json({ success: false, error: 'application_id가 필요합니다.' }, { status: 400 })
  }
  if (!connection_id || typeof connection_id !== 'string') {
    return NextResponse.json({ success: false, error: 'connection_id가 필요합니다.' }, { status: 400 })
  }
  const amountNum = amount !== undefined && amount !== null && amount !== '' ? Number(amount) : null

  const service = createServiceClient()

  // Verify ownership
  const { data: app, error: appError } = await service
    .from('service_applications')
    .select('id, worker_pay')
    .eq('id', application_id)
    .eq('business_id', businessId)
    .maybeSingle()

  if (appError || !app) {
    return NextResponse.json({ success: false, error: '신청서를 찾을 수 없습니다.' }, { status: 404 })
  }

  const currentPay = (app as { worker_pay: Record<string, number> | null }).worker_pay ?? {}
  const updatedPay: Record<string, number | null> = { ...currentPay }

  if (amountNum === null) {
    delete updatedPay[connection_id as string]
  } else {
    updatedPay[connection_id as string] = amountNum
  }

  const { error: updateError } = await service
    .from('service_applications')
    .update({ worker_pay: updatedPay, updated_at: new Date().toISOString() })
    .eq('id', application_id)
    .eq('business_id', businessId)

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
