import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyOtp } from '@/lib/otp/store'
import type { ApiResponse } from '@/types'

interface VerifyOtpBody {
  phone: string
  otp: string
}

interface VerifyOtpData {
  userId: string
  isNewUser: boolean
}

function isValidPhone(phone: string): boolean {
  return /^01[016789]\d{7,8}$/.test(phone)
}

function isValidOtp(otp: string): boolean {
  return /^\d{6}$/.test(otp)
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<VerifyOtpData>>> {
  let body: VerifyOtpBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: '잘못된 요청 형식입니다' },
      { status: 400 }
    )
  }

  const { phone, otp } = body
  if (!phone || !isValidPhone(phone)) {
    return NextResponse.json(
      { success: false, error: '올바른 휴대폰 번호를 입력해주세요' },
      { status: 400 }
    )
  }
  if (!otp || !isValidOtp(otp)) {
    return NextResponse.json(
      { success: false, error: '6자리 인증번호를 입력해주세요' },
      { status: 400 }
    )
  }

  const isValid = await verifyOtp(phone, otp)
  if (!isValid) {
    return NextResponse.json(
      { success: false, error: '인증번호가 올바르지 않거나 만료되었습니다' },
      { status: 401 }
    )
  }

  const supabase = createServiceClient()

  // 기존 사용자 조회 (phone으로 ilitda.profiles 확인)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .maybeSingle()

  if (existingProfile) {
    return NextResponse.json({
      success: true,
      data: { userId: existingProfile.id, isNewUser: false },
    })
  }

  // 신규 사용자: Supabase Auth에 phone 기반 사용자 생성
  const { data: newUser, error: createError } =
    await supabase.auth.admin.createUser({
      phone,
      phone_confirm: true,
    })

  if (createError || !newUser.user) {
    return NextResponse.json(
      { success: false, error: '사용자 생성에 실패했습니다' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: { userId: newUser.user.id, isNewUser: true },
  })
}
