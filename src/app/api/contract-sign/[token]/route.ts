import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface SignBody {
  otp_code:          string
  signature_data_url: string
}

// ─── GET: 토큰으로 계약서 조회 (공개) ───────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const service = createServiceClient()
  const now     = new Date().toISOString()

  const { data, error } = await service.schema('ilitda')
    .from('contracts')
    .select(`
      id,
      signing_status,
      monthly_price,
      annual_price,
      start_date,
      end_date,
      contract_snapshot,
      customer_phone,
      service_applications(
        owner_name,
        business_name
      )
    `)
    .eq('signing_token', token)
    .is('deleted_at', null)
    .is('voided_at', null)
    .gt('token_expires_at', now)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: '유효하지 않거나 만료된 계약서입니다' }, { status: 404 })
  }

  return NextResponse.json({ contract: data })
}

// ─── POST: OTP 검증 + 서명 저장 (공개) ──────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  let body: SignBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  }

  if (!body.otp_code?.trim() || !body.signature_data_url?.trim()) {
    return NextResponse.json({ error: 'OTP 코드와 서명이 필요합니다' }, { status: 400 })
  }

  const service = createServiceClient()
  const now     = new Date().toISOString()

  // 계약서 조회
  const { data: contract, error: fetchError } = await service.schema('ilitda')
    .from('contracts')
    .select('id, otp_code, otp_expires_at, signing_status')
    .eq('signing_token', token)
    .is('deleted_at', null)
    .is('voided_at', null)
    .gt('token_expires_at', now)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!contract) {
    return NextResponse.json({ error: '유효하지 않거나 만료된 계약서입니다' }, { status: 404 })
  }
  if (contract.signing_status === 'customer_signed' || contract.signing_status === 'completed') {
    return NextResponse.json({ error: '이미 서명 완료된 계약서입니다' }, { status: 400 })
  }

  // OTP 검증
  const otpExpired = !contract.otp_expires_at || new Date(contract.otp_expires_at as string) < new Date()
  if (otpExpired) {
    return NextResponse.json({ error: 'OTP가 만료되었습니다. 담당자에게 재발송을 요청해 주세요' }, { status: 400 })
  }
  if (contract.otp_code !== body.otp_code.trim()) {
    return NextResponse.json({ error: 'OTP 코드가 일치하지 않습니다' }, { status: 400 })
  }

  // IP 추출
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'

  const { error: updateError } = await service.schema('ilitda')
    .from('contracts')
    .update({
      customer_signature: body.signature_data_url,
      customer_agreed_at: now,
      customer_ip:        ip,
      signing_status:     'customer_signed',
      otp_code:           null,
      updated_at:         now,
    })
    .eq('id', contract.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
