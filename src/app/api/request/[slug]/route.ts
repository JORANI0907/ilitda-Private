import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ slug: string }> }

function strOrNull(v: unknown): string | null {
  return v && typeof v === 'string' ? v.trim() || null : null
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { slug } = await params

  const service = createServiceClient()

  const { data: business, error } = await service
    .from('businesses')
    .select('id, business_name, request_slug')
    .eq('request_slug', slug)
    .maybeSingle()

  if (error || !business) {
    return NextResponse.json(
      { success: false, error: '존재하지 않는 신청 페이지입니다.' },
      { status: 404 },
    )
  }

  return NextResponse.json({
    success: true,
    data: { businessName: business.business_name, slug: business.request_slug },
  })
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { slug } = await params

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const b = body as Record<string, unknown>

  const {
    client_name,
    client_phone,
    client_address,
    desired_date,
    desired_time,
    notes,
    owner_name,
    email,
    business_number,
    account_number,
    payment_method,
    elevator,
    parking,
    building_access,
    access_method,
    care_scope,
  } = b

  if (!client_name || typeof client_name !== 'string' || !client_name.trim()) {
    return NextResponse.json({ success: false, error: '업체명/이름을 입력해 주세요.' }, { status: 400 })
  }
  if (!client_phone || typeof client_phone !== 'string' || !client_phone.trim()) {
    return NextResponse.json({ success: false, error: '연락처를 입력해 주세요.' }, { status: 400 })
  }
  if (!client_address || typeof client_address !== 'string' || !client_address.trim()) {
    return NextResponse.json({ success: false, error: '주소를 입력해 주세요.' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: business, error: bizError } = await service
    .from('businesses')
    .select('id')
    .eq('request_slug', slug)
    .maybeSingle()

  if (bizError || !business) {
    return NextResponse.json(
      { success: false, error: '존재하지 않는 신청 페이지입니다.' },
      { status: 404 },
    )
  }

  const { error } = await service.from('service_requests').insert({
    business_id: business.id,
    client_name: (client_name as string).trim(),
    client_phone: (client_phone as string).trim(),
    client_address: (client_address as string).trim(),
    desired_date: strOrNull(desired_date),
    desired_time: strOrNull(desired_time),
    notes: strOrNull(notes),
    status: 'pending',
    owner_name: strOrNull(owner_name),
    email: strOrNull(email),
    business_number: strOrNull(business_number),
    account_number: strOrNull(account_number),
    payment_method: strOrNull(payment_method),
    elevator: strOrNull(elevator),
    parking: strOrNull(parking),
    building_access: strOrNull(building_access),
    access_method: strOrNull(access_method),
    care_scope: strOrNull(care_scope),
  })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
