import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { verifyOtp } from '@/lib/otp/store'
import { createServiceClient } from '@/lib/supabase/server'

function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

interface RegisterBody {
  username: string
  password: string
  name: string
  phone: string
  otp: string
  active_role: 'business' | 'worker'
  is_business: boolean
  is_worker: boolean
  business_name?: string
  address?: string
  business_number?: string
}

export async function POST(request: NextRequest) {
  let body: RegisterBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const {
    username, password, name, phone, otp,
    active_role, is_business, is_worker,
    business_name, address, business_number,
  } = body

  if (!username?.trim() || !password || !name?.trim() || !phone?.trim() || !otp?.trim()) {
    return NextResponse.json({ success: false, error: '필수 항목을 모두 입력해주세요.' }, { status: 400 })
  }

  const cleanUsername = username.trim().toLowerCase()

  if (!/^[a-z0-9_]{4,20}$/.test(cleanUsername)) {
    return NextResponse.json(
      { success: false, error: '아이디는 4~20자 영문 소문자·숫자·_만 사용 가능합니다.' },
      { status: 400 },
    )
  }

  if (password.length < 8) {
    return NextResponse.json({ success: false, error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
  }

  if (!is_business && !is_worker) {
    return NextResponse.json({ success: false, error: '역할을 하나 이상 선택해주세요.' }, { status: 400 })
  }

  let isValid: boolean
  try {
    isValid = await verifyOtp(phone, otp)
  } catch (err) {
    console.error('[register] verifyOtp 실패:', err)
    return NextResponse.json({ success: false, error: '인증 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }

  if (!isValid) {
    return NextResponse.json(
      { success: false, error: '인증번호가 올바르지 않거나 만료되었습니다.' },
      { status: 401 },
    )
  }

  const service = createServiceClient()

  const { data: existingProfile } = await service
    .from('profiles')
    .select('id')
    .eq('username', cleanUsername)
    .maybeSingle()

  if (existingProfile) {
    return NextResponse.json({ success: false, error: '이미 사용 중인 아이디입니다.' }, { status: 409 })
  }

  const admin = createAdminClient()
  const email = `${cleanUsername}@ilitda.internal`

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  })

  if (createError || !newUser?.user) {
    console.error('[register] createUser 실패:', createError)
    return NextResponse.json({ success: false, error: '계정 생성에 실패했습니다.' }, { status: 500 })
  }

  const userId = newUser.user.id
  const finalRole = active_role ?? (is_business ? 'business' : 'worker')

  const { error: profileError } = await service.from('profiles').insert({
    id: userId,
    username: cleanUsername,
    phone: phone.trim(),
    name: name.trim(),
    active_role: finalRole,
    is_business: !!is_business,
    is_worker: !!is_worker,
  })

  if (profileError) {
    console.error('[register] 프로필 생성 실패:', profileError)
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ success: false, error: '프로필 생성에 실패했습니다.' }, { status: 500 })
  }

  if (is_business && business_name?.trim()) {
    const slug = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    const { error: bizError } = await service.from('businesses').insert({
      profile_id: userId,
      business_name: business_name.trim(),
      registration_number: business_number?.trim() || null,
      address: address?.trim() || null,
      request_slug: slug,
    })
    if (bizError) {
      console.error('[register] 사업자 생성 실패:', bizError)
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { success: false, error: '사업자 프로필 생성에 실패했습니다.' },
        { status: 500 },
      )
    }
  }

  if (is_worker) {
    await service.from('workers').insert({
      profile_id: userId,
      available_regions: [],
      certifications: [],
      experience_years: 0,
    })
  }

  const successResponse = NextResponse.json({ success: true, data: { role: finalRole } }, { status: 201 })

  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            successResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { error: signInError } = await ssrClient.auth.signInWithPassword({ email, password })
  if (signInError) {
    console.error('[register] 세션 생성 실패:', signInError)
  }

  return successResponse
}
