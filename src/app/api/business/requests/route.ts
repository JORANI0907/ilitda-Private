import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({
      success: true,
      data: [],
      meta: { total: 0, pending_count: 0, page: 1, limit: 50 },
    })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const service = createServiceClient()

  const { data: business, error: bizError } = await service
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (bizError || !business) {
    return NextResponse.json(
      { success: false, error: '사업자 정보를 찾을 수 없습니다.' },
      { status: 404 },
    )
  }

  let query = service
    .from('service_requests')
    .select('*', { count: 'exact' })
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })

  if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // pending 건수는 전체 기준으로 별도 조회
  const { count: pendingCount } = await service
    .from('service_requests')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', business.id)
    .eq('status', 'pending')

  return NextResponse.json({
    success: true,
    data: data ?? [],
    meta: { total: count ?? 0, pending_count: pendingCount ?? 0, page: 1, limit: 50 },
  })
}
