import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
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

// PATCH: 담당자 연락처 저장 (OTP 없이 직접 저장)
export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse<{ phone: string }>>> {
  const auth = await getAuthBusiness()
  if (!auth) return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { phoneNumber?: string }
  const phone = (body.phoneNumber ?? '').replace(/[^0-9]/g, '')
  if (!phone || phone.length < 9) {
    return NextResponse.json({ success: false, error: '올바른 전화번호를 입력해주세요.' }, { status: 400 })
  }

  await auth.supabase
    .schema('ilitda')
    .from('businesses')
    .update({ solapi_from_phone: phone, solapi_phone_verified: true, solapi_pending_id: null })
    .eq('id', auth.biz.id)

  return NextResponse.json({ success: true, data: { phone } })
}

// DELETE: 담당자 연락처 해제
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
