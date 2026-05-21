import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

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

// PUT: service_applications의 assigned_connection_ids 업데이트
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

  const { connection_ids } = body as Record<string, unknown>

  if (!Array.isArray(connection_ids)) {
    return NextResponse.json({ success: false, error: 'connection_ids 배열이 필요합니다.' }, { status: 400 })
  }

  const ids = connection_ids.filter((c): c is string => typeof c === 'string')

  const service = createServiceClient()

  // Verify ownership
  const { data: app, error: appError } = await service
    .from('service_applications')
    .select('id')
    .eq('id', id)
    .eq('business_id', businessId)
    .maybeSingle()

  if (appError || !app) {
    return NextResponse.json({ success: false, error: '신청서를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { error: updateError } = await service
    .from('service_applications')
    .update({
      assigned_connection_ids: ids.length > 0 ? ids : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('business_id', businessId)

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
