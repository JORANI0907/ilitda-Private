import { NextRequest, NextResponse } from 'next/server'
import { verifyOtp } from '@/lib/otp/store'
import type { ApiResponse } from '@/types'

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ valid: boolean }>>> {
  let body: { phone: string; otp: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 형식입니다' }, { status: 400 })
  }

  const { phone, otp } = body
  if (!phone || !otp) {
    return NextResponse.json({ success: false, error: '전화번호와 인증번호를 입력해주세요' }, { status: 400 })
  }

  try {
    const valid = await verifyOtp(phone, otp)
    return NextResponse.json({ success: true, data: { valid } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '인증 처리 중 오류가 발생했습니다'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
