import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, ServiceApplication } from '@/types'

function dateOf(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

const DEMO_APPLICATIONS = (): ServiceApplication[] => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const prevYear  = now.getMonth() === 0 ? y - 1 : y
  const pm = String(prevMonth).padStart(2, '0')

  const d = (day: number, isPrev = false) =>
    `${isPrev ? prevYear : y}-${isPrev ? pm : m}-${String(day).padStart(2, '0')}`

  return [
    { id: 'demo-app-1', business_name: '스타벅스 강남역점', owner_name: '김대현', phone: '010-1234-5678', address: '서울 강남구 강남대로 396', care_scope: '주방후드 청소', status: '예약확정', construction_date: d(5), construction_time: '10:00', is_favorite: false } as unknown as ServiceApplication,
    { id: 'demo-app-2', business_name: '맥도날드 역삼점',   owner_name: '이민준', phone: '010-2345-6789', address: '서울 강남구 테헤란로 101', care_scope: '에어컨 청소',   status: '서비스완료', construction_date: d(3),         construction_time: '14:00', is_favorite: false } as unknown as ServiceApplication,
    { id: 'demo-app-3', business_name: '이디야 선릉점',     owner_name: '박서연', phone: '010-3456-7890', address: '서울 강남구 선릉로 200',   care_scope: '바닥 청소',     status: '신규',       construction_date: d(12),        construction_time: '09:00', is_favorite: true  } as unknown as ServiceApplication,
    { id: 'demo-app-4', business_name: '버거킹 삼성점',     owner_name: '최지원', phone: '010-4567-8901', address: '서울 강남구 삼성로 100',   care_scope: '덕트 청소',     status: '예약확정', construction_date: d(15),        construction_time: '11:00', is_favorite: false } as unknown as ServiceApplication,
    { id: 'demo-app-5', business_name: '롯데리아 잠실점',   owner_name: '정수현', phone: '010-5678-9012', address: '서울 송파구 올림픽로 240', care_scope: '식기세척기 청소', status: '결제완료', construction_date: d(28, true),  construction_time: '15:00', is_favorite: false } as unknown as ServiceApplication,
    { id: 'demo-app-6', business_name: 'BBQ 강동점',        owner_name: '한지훈', phone: '010-6789-0123', address: '서울 강동구 천호대로 200', care_scope: '주방후드 청소', status: '서비스완료', construction_date: d(20, true),  construction_time: '10:30', is_favorite: false } as unknown as ServiceApplication,
    { id: 'demo-app-7', business_name: '파리바게뜨 성수점', owner_name: '윤소희', phone: '010-7890-1234', address: '서울 성동구 성수이로 200', care_scope: '에어컨 청소',   status: '견적발송', construction_date: d(20),        construction_time: '13:00', is_favorite: false } as unknown as ServiceApplication,
    { id: 'demo-app-8', business_name: '교촌치킨 마포점',   owner_name: '임대호', phone: '010-8901-2345', address: '서울 마포구 마포대로 100', care_scope: '주방후드 청소', status: '신규',       construction_date: d(25),        construction_time: null,    is_favorite: false } as unknown as ServiceApplication,
  ]
}

export async function GET(req: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json<ApiResponse<ServiceApplication[]> & { isDemo: boolean }>({
      success: true,
      data: DEMO_APPLICATIONS(),
      isDemo: true,
    })
  }

  const supabase = createServiceClient()

  const { data: business, error: bizError } = await supabase
    .schema('ilitda')
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (bizError || !business) {
    return NextResponse.json<ApiResponse>({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''
  const status = searchParams.get('status') || ''
  const favorite = searchParams.get('favorite') === '1'

  try {
    let query = supabase
      .schema('ilitda')
      .from('service_applications')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    if (favorite) query = query.eq('is_favorite', true)
    if (status) query = query.eq('status', status)
    if (q) {
      query = query.or(
        `business_name.ilike.%${q}%,owner_name.ilike.%${q}%,phone.ilike.%${q}%`
      )
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json<ApiResponse<ServiceApplication[]>>({ success: true, data: data ?? [] })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '조회 실패'
    return NextResponse.json<ApiResponse>({ success: false, error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json<ApiResponse>({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })

  const supabase = createServiceClient()
  try {
    const { data: business, error: bizErr } = await supabase
      .schema('ilitda')
      .from('businesses')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (bizErr || !business) {
      return NextResponse.json<ApiResponse>({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    const body = await req.json()

    const { data, error } = await supabase
      .schema('ilitda')
      .from('service_applications')
      .insert([{ ...body, business_id: business.id }])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json<ApiResponse<ServiceApplication>>({ success: true, data }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '저장 실패'
    return NextResponse.json<ApiResponse>({ success: false, error: msg }, { status: 500 })
  }
}
