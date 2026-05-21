import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/solapi/client'

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// ─── POST: OTP 생성 및 SMS 발송 ──────────────────────────────────

export async function POST(
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
    .select('id, business_name').eq('profile_id', user.id).maybeSingle()
  if (!biz) {
    return NextResponse.json({ error: '사업자 정보 없음' }, { status: 403 })
  }

  // 계약서 조회 (소유권 + 전화번호 + 서명 토큰)
  const { data: contract, error: fetchError } = await service.schema('ilitda')
    .from('contracts')
    .select('id, customer_phone, signing_token, signing_status')
    .eq('id', id)
    .eq('business_id', biz.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!contract) {
    return NextResponse.json({ error: '계약서를 찾을 수 없습니다' }, { status: 404 })
  }
  if (contract.signing_status === 'voided') {
    return NextResponse.json({ error: '파기된 계약서입니다' }, { status: 400 })
  }
  if (contract.signing_status === 'completed') {
    return NextResponse.json({ error: '이미 완료된 계약서입니다' }, { status: 400 })
  }

  const otp           = generateOtp()
  const otpExpiresAt  = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  const signingToken  = contract.signing_token as string

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const signUrl    = `${appUrl}/contract-sign/${signingToken}`
  const bizName    = biz.business_name ?? '업체'
  const smsContent = `[${bizName}] 계약서 서명 요청\n확인코드: ${otp}\n서명 링크: ${signUrl}`

  // DB 업데이트
  const { error: updateError } = await service.schema('ilitda')
    .from('contracts')
    .update({
      otp_code:       otp,
      otp_expires_at: otpExpiresAt,
      signing_status: 'pending_customer',
      updated_at:     new Date().toISOString(),
    })
    .eq('id', id)
    .eq('business_id', biz.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // SMS 발송
  try {
    await sendSMS(contract.customer_phone as string, smsContent)
  } catch (smsErr) {
    return NextResponse.json(
      { error: `OTP 저장 완료, SMS 발송 실패: ${smsErr instanceof Error ? smsErr.message : '알 수 없는 오류'}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
