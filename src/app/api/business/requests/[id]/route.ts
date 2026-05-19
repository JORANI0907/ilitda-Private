import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ServiceType } from '@/types'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const { action, rejected_reason, schedule_date, schedule_time, fee } = body as Record<string, unknown>

  if (action !== 'accept' && action !== 'reject') {
    return NextResponse.json({ success: false, error: '올바른 action 값이 필요합니다.' }, { status: 400 })
  }

  const service = createServiceClient()

  // 사업자 인증
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

  // 신청서 조회 및 소유권 검증
  const { data: req, error: reqError } = await service
    .from('service_requests')
    .select('*')
    .eq('id', id)
    .eq('business_id', business.id)
    .maybeSingle()

  if (reqError || !req) {
    return NextResponse.json({ success: false, error: '신청서를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (req.status !== 'pending') {
    return NextResponse.json({ success: false, error: '이미 처리된 신청서입니다.' }, { status: 409 })
  }

  if (action === 'reject') {
    const { error } = await service
      .from('service_requests')
      .update({
        status: 'rejected',
        rejected_reason: rejected_reason && typeof rejected_reason === 'string'
          ? rejected_reason.trim() || null
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  // accept 처리
  if (!schedule_date || typeof schedule_date !== 'string') {
    return NextResponse.json({ success: false, error: '일정 날짜를 입력해 주세요.' }, { status: 400 })
  }

  // 1. 전화번호로 기존 client 조회
  let clientId: string

  const { data: existingClient } = await service
    .from('clients')
    .select('id')
    .eq('business_id', business.id)
    .eq('phone', req.client_phone)
    .is('deleted_at', null)
    .maybeSingle()

  if (existingClient) {
    clientId = existingClient.id
  } else {
    // 2. 없으면 clients INSERT
    const { data: newClient, error: clientError } = await service
      .from('clients')
      .insert({
        business_id: business.id,
        name: req.client_name,
        phone: req.client_phone,
        address: req.client_address,
        service_type: req.service_type as ServiceType,
      })
      .select('id')
      .single()

    if (clientError || !newClient) {
      return NextResponse.json(
        { success: false, error: clientError?.message ?? '고객 등록에 실패했습니다.' },
        { status: 500 },
      )
    }

    clientId = newClient.id
  }

  // 3. schedules INSERT
  const { data: schedule, error: scheduleError } = await service
    .from('schedules')
    .insert({
      business_id: business.id,
      client_id: clientId,
      service_date: schedule_date,
      start_time: schedule_time && typeof schedule_time === 'string' ? schedule_time : null,
      service_type: req.service_type,
      fee: fee !== undefined && fee !== null && fee !== '' ? Number(fee) : null,
      status: 'scheduled',
    })
    .select('id')
    .single()

  if (scheduleError || !schedule) {
    return NextResponse.json(
      { success: false, error: scheduleError?.message ?? '일정 생성에 실패했습니다.' },
      { status: 500 },
    )
  }

  // 4. service_requests UPDATE
  const { error: updateError } = await service
    .from('service_requests')
    .update({
      status: 'accepted',
      converted_schedule_id: schedule.id,
      converted_client_id: clientId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { schedule_id: schedule.id } })
}
