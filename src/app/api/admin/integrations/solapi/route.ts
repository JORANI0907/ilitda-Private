import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/solapi/client'
import { generateOtp, storeOtp, verifyOtp } from '@/lib/otp/store'
import type { ApiResponse } from '@/types'

async function getAuthBusiness() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const service = createServiceClient()
  const { data: biz } = await service
    .schema('ilitda')
    .from('businesses')
    .select('id, solapi_from_phone, solapi_phone_verified')
    .eq('profile_id', user.id)
    .maybeSingle()

  return biz ? { supabase: service, biz } : null
}

// POST: 발신번호 인증 OTP 발송 (1단계)
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const auth = await getAuthBusiness()
  if (!auth) return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })

  const { phoneNumber } = await req.json() as { phoneNumber: string }
  if (!phoneNumber || !/^01[016789]\d{7,8}$/.test(phoneNumber)) {
    return NextResponse.json({ success: false, error: '올바른 휴대폰 번호를 입력해주세요.' }, { status: 400 })
  }

  try {
    const otp = generateOtp()
    await storeOtp(phoneNumber, otp)
    await sendSMS(phoneNumber, `[일잇다] 발신번호 인증번호: ${otp} (5분 이내 입력)`)
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '요청 실패'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// PUT: OTP 검증 + 발신번호 저장 (2단계)
export async function PUT(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const auth = await getAuthBusiness()
  if (!auth) return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })

  const { otp, phoneNumber } = await req.json() as { otp: string; phoneNumber: string }
  if (!phoneNumber || !otp) {
    return NextResponse.json({ success: false, error: '전화번호와 인증번호를 모두 입력해주세요.' }, { status: 400 })
  }

  try {
    const valid = await verifyOtp(phoneNumber, otp)
    if (!valid) {
      return NextResponse.json({ success: false, error: '인증번호가 올바르지 않거나 만료되었습니다.' }, { status: 400 })
    }

    await auth.supabase
      .schema('ilitda')
      .from('businesses')
      .update({
        solapi_from_phone: phoneNumber,
        solapi_phone_verified: true,
        solapi_pending_id: null,
      })
      .eq('id', auth.biz.id)

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '인증 실패'
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}

// PATCH: 가입 연락처로 발신번호 자동 설정 (OTP 없이 — 가입 시 이미 인증된 번호)
export async function PATCH(): Promise<NextResponse<ApiResponse<{ phone: string }>>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })

  const service = createServiceClient()
  const [bizResult, profileResult] = await Promise.all([
    service.schema('ilitda').from('businesses').select('id').eq('profile_id', user.id).maybeSingle(),
    service.schema('ilitda').from('profiles').select('phone').eq('id', user.id).maybeSingle(),
  ])

  if (!bizResult.data) return NextResponse.json({ success: false, error: '사업체 정보 없음' }, { status: 400 })
  if (!profileResult.data?.phone) return NextResponse.json({ success: false, error: '가입 연락처가 없습니다.' }, { status: 400 })

  const phone = profileResult.data.phone.replace(/[^0-9]/g, '')
  if (!/^01[016789]\d{7,8}$/.test(phone)) {
    return NextResponse.json({ success: false, error: '가입 연락처 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  await service
    .schema('ilitda')
    .from('businesses')
    .update({ solapi_from_phone: phone, solapi_phone_verified: true, solapi_pending_id: null })
    .eq('id', bizResult.data.id)

  return NextResponse.json({ success: true, data: { phone } })
}

// DELETE: 발신번호 해제
export async function DELETE(): Promise<NextResponse<ApiResponse>> {
  const auth = await getAuthBusiness()
  if (!auth) return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })

  await auth.supabase
    .schema('ilitda')
    .from('businesses')
    .update({ solapi_from_phone: null, solapi_phone_verified: false, solapi_pending_id: null })
    .eq('id', auth.biz.id)

  return NextResponse.json({ success: true })
}
