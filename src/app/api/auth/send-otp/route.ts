import { NextRequest, NextResponse } from 'next/server'
import { sendSMS } from '@/lib/solapi/client'
import { storeOtp, generateOtp } from '@/lib/otp/store'
import type { ApiResponse } from '@/types'

interface SendOtpBody {
  phone: string
}

function isValidPhone(phone: string): boolean {
  return /^01[016789]\d{7,8}$/.test(phone)
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  let body: SendOtpBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: '잘못된 요청 형식입니다' },
      { status: 400 }
    )
  }

  const { phone } = body
  if (!phone || !isValidPhone(phone)) {
    return NextResponse.json(
      { success: false, error: '올바른 휴대폰 번호를 입력해주세요' },
      { status: 400 }
    )
  }

  const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development'
  const otp = isDev ? '000000' : generateOtp()

  await storeOtp(phone, otp)

  if (!isDev) {
    try {
      await sendSMS(phone, `[일잇다] 인증번호: ${otp} (5분 이내 입력)`)
    } catch {
      return NextResponse.json(
        { success: false, error: 'SMS 발송에 실패했습니다. 잠시 후 다시 시도해주세요' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ success: true, message: '인증번호가 발송되었습니다' })
}
