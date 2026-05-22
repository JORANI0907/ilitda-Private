import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const DEMO_REQUESTS = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const prevM = String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0')
  const prevY = now.getMonth() === 0 ? y - 1 : y

  return [
    {
      id: 'demo-req-1', client_name: '뚜레쥬르 종로점', client_phone: '010-1111-2222',
      client_address: '서울 종로구 종로 100', service_type: '1회성케어',
      care_scope: '에어컨 청소', desired_date: `${y}-${m}-18`, desired_time: null,
      status: 'pending', notes: null, rejected_reason: null, assigned_connection_ids: [],
    },
    {
      id: 'demo-req-2', client_name: '홈플러스 영등포점', client_phone: '010-2222-3333',
      client_address: '서울 영등포구 영중로 15', service_type: '1회성케어',
      care_scope: '주방후드 청소', desired_date: `${y}-${m}-22`, desired_time: null,
      status: 'pending', notes: null, rejected_reason: null, assigned_connection_ids: [],
    },
    {
      id: 'demo-req-3', client_name: '이마트 성수점', client_phone: '010-3333-4444',
      client_address: '서울 성동구 성수이로 100', service_type: '정기딥케어',
      care_scope: '덕트 청소', desired_date: `${prevY}-${prevM}-15`, desired_time: '10:00',
      status: 'accepted', notes: '2층 주방 우선', rejected_reason: null, assigned_connection_ids: [],
    },
    {
      id: 'demo-req-4', client_name: '코스트코 양재점', client_phone: '010-4444-5555',
      client_address: '서울 서초구 양재대로 300', service_type: '1회성케어',
      care_scope: '바닥 청소', desired_date: `${prevY}-${prevM}-10`, desired_time: null,
      status: 'rejected', notes: null, rejected_reason: '일정 불가', assigned_connection_ids: [],
    },
  ]
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const demo = DEMO_REQUESTS()
    return NextResponse.json({
      success: true,
      data: demo,
      isDemo: true,
      meta: { total: demo.length, pending_count: demo.filter(r => r.status === 'pending').length, page: 1, limit: 50 },
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
