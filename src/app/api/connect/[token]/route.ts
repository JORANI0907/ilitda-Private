import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ token: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { token } = await params

  const service = createServiceClient()

  const { data: connection, error } = await service
    .from('connections')
    .select('id, display_name, status, businesses(business_name)')
    .eq('invite_token', token)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !connection) {
    return NextResponse.json({ success: false, error: '유효하지 않은 초대 링크입니다.' }, { status: 404 })
  }

  if (connection.status === 'accepted') {
    return NextResponse.json({ success: false, error: '이미 수락된 초대입니다.' }, { status: 410 })
  }

  const biz = connection.businesses as unknown as { business_name: string } | null

  return NextResponse.json({
    success: true,
    data: {
      connectionId: connection.id,
      displayName: connection.display_name,
      businessName: biz?.business_name ?? '알 수 없는 사업자',
    },
  })
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { token } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const service = createServiceClient()

  const { data: connection, error: fetchError } = await service
    .from('connections')
    .select('id, status')
    .eq('invite_token', token)
    .is('deleted_at', null)
    .maybeSingle()

  if (fetchError || !connection) {
    return NextResponse.json({ success: false, error: '유효하지 않은 초대 링크입니다.' }, { status: 404 })
  }

  if (connection.status === 'accepted') {
    return NextResponse.json({ success: false, error: '이미 수락된 초대입니다.' }, { status: 410 })
  }

  const { error } = await service
    .from('connections')
    .update({
      worker_profile_id: user.id,
      status: 'accepted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
