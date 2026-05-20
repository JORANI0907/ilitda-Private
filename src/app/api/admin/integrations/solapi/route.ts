import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requestSenderVerification, verifySenderRegistration } from '@/lib/solapi/sender'
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

// POST: 발신번호 OTP 요청 (1단계)
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ uniqueId: string }>>> {
  const auth = await getAuthBusiness()
  if (!auth) return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })

  const { phoneNumber } = await req.json() as { phoneNumber: string }
  if (!phoneNumber) return NextResponse.json({ success: false, error: '전화번호를 입력해주세요.' }, { status: 400 })

  try {
    const uniqueId = await requestSenderVerification(phoneNumber)
    // pending 상태 임시 저장 (인증 완료 시 덮어씀)
    await auth.supabase
      .schema('ilitda')
      .from('businesses')
      .update({ solapi_pending_id: uniqueId })
      .eq('id', auth.biz.id)

    return NextResponse.json({ success: true, data: { uniqueId } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '요청 실패'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// PUT: OTP 검증 + 발신번호 저장 (2단계)
export async function PUT(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const auth = await getAuthBusiness()
  if (!auth) return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })

  const { uniqueId, otp, phoneNumber } = await req.json() as { uniqueId: string; otp: string; phoneNumber: string }

  try {
    await verifySenderRegistration(uniqueId, otp)
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
