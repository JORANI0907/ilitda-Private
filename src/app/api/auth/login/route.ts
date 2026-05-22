import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const { email, password } = body

  if (!email?.trim() || !password?.trim()) {
    return NextResponse.json(
      { success: false, error: '이메일과 비밀번호를 입력해주세요.' },
      { status: 400 },
    )
  }

  const cleanEmail = email.trim().toLowerCase()
  const service = createServiceClient()

  const { data: profile } = await service
    .from('profiles')
    .select('id, active_role')
    .eq('email', cleanEmail)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json(
      { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 },
    )
  }

  const successResponse = NextResponse.json({
    success: true,
    data: { role: profile.active_role ?? 'business' },
  })

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

  const { error: signInError } = await ssrClient.auth.signInWithPassword({ email: cleanEmail, password })

  if (signInError) {
    return NextResponse.json(
      { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 },
    )
  }

  return successResponse
}
