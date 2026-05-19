import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { verifyOtp } from '@/lib/otp/store'
import { randomUUID } from 'crypto'
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

function toE164(phone: string): string {
  return '+82' + phone.slice(1)
}

// public 스키마 RPC + auth.admin 전용 클라이언트 (schema 오버라이드 없음)
function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ilitda.profiles에서 기존 사용자 ID 조회
async function findProfileUserId(phone: string): Promise<string | null> {
  const client = createAdminClient()
  const { data, error } = await client.rpc('get_profile_id_by_phone', { p_phone: phone })
  if (error) {
    console.error('[verify-otp] get_profile_id_by_phone 실패:', error)
    return null
  }
  return (data as string | null) ?? null
}

// auth.users에서 phone으로 기존 Auth 사용자 ID 조회
async function findAuthUserId(phone: string): Promise<string | null> {
  const client = createAdminClient()
  const { data, error } = await client.rpc('get_auth_user_id_by_phone', { p_phone: phone })
  if (error) {
    console.error('[verify-otp] get_auth_user_id_by_phone 실패:', error)
    return null
  }
  return (data as string | null) ?? null
}

// 임시 이메일+비밀번호를 통해 Supabase 세션을 수립하고 응답 쿠키에 주입
// (Phone 로그인이 비활성화 상태이므로 이메일 방식 사용)
async function establishSession(
  userId: string,
  request: NextRequest,
  response: NextResponse
): Promise<void> {
  const admin = createAdminClient()
  const tempEmail = `${userId}@phone.ilitda.internal`
  const tempPassword = randomUUID()

  const { error: setPwError } = await admin.auth.admin.updateUserById(userId, {
    email: tempEmail,
    email_confirm: true,
    password: tempPassword,
  })
  if (setPwError) {
    console.error('[verify-otp] 임시 인증 설정 실패:', setPwError)
    return
  }

  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error: signInError } = await ssrClient.auth.signInWithPassword({
    email: tempEmail,
    password: tempPassword,
  })
  if (signInError) {
    console.error('[verify-otp] 세션 생성 실패:', signInError)
  }
  // 비밀번호를 재변경하지 않음: updateUserById는 updated_at을 갱신해 JWT를 즉시 무효화하기 때문
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

  let isValid: boolean
  try {
    isValid = await verifyOtp(phone, otp)
  } catch (err) {
    console.error('[verify-otp] verifyOtp 실패:', err)
    return NextResponse.json(
      { success: false, error: '인증 처리 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }

  if (!isValid) {
    return NextResponse.json(
      { success: false, error: '인증번호가 올바르지 않거나 만료되었습니다' },
      { status: 401 }
    )
  }

  // 1. ilitda.profiles에 기존 사용자가 있는지 확인 (로그인 경로)
  const profileUserId = await findProfileUserId(phone)
  if (profileUserId) {
    const response = NextResponse.json({
      success: true,
      data: { userId: profileUserId, isNewUser: false },
    })
    await establishSession(profileUserId, request, response)
    return response
  }

  // 2. auth.users에 기존 사용자가 있는지 확인 (가입 미완료 재시도 경로)
  const existingAuthId = await findAuthUserId(phone)
  if (existingAuthId) {
    const response = NextResponse.json({
      success: true,
      data: { userId: existingAuthId, isNewUser: true },
    })
    await establishSession(existingAuthId, request, response)
    return response
  }

  // 3. 완전 신규 사용자: Auth 사용자 생성
  const admin = createAdminClient()
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    phone: toE164(phone),
    phone_confirm: true,
  })

  if (createError || !newUser?.user) {
    console.error('[verify-otp] createUser 실패:', createError)
    return NextResponse.json(
      { success: false, error: '사용자 생성에 실패했습니다' },
      { status: 500 }
    )
  }

  const response = NextResponse.json({
    success: true,
    data: { userId: newUser.user.id, isNewUser: true },
  })
  await establishSession(newUser.user.id, request, response)
  return response
}
