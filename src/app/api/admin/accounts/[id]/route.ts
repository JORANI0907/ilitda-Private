import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

interface AccountDetail {
  business: {
    id: string
    profile_id: string
    business_name: string
    registration_number: string | null
    address: string | null
    representative_name: string | null
    plan: string
    plan_expires_at: string | null
    created_at: string
  }
  profile: {
    name: string
    phone: string
    email: string | null
  } | null
  worker: {
    account_bank: string | null
    account_number: string | null
    birthdate: string | null
  } | null
}

async function checkAdmin(userId: string): Promise<boolean> {
  const service = createServiceClient()
  const { data } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle()
  return data?.is_admin === true
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<AccountDetail>>> {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const isAdmin = await checkAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const service = createServiceClient()

  const { data: business, error: bizError } = await service
    .from('businesses')
    .select('id, profile_id, business_name, registration_number, address, representative_name, plan, plan_expires_at, created_at')
    .eq('id', id)
    .maybeSingle()

  if (bizError) {
    return NextResponse.json({ success: false, error: bizError.message }, { status: 500 })
  }

  if (!business) {
    return NextResponse.json({ success: false, error: '계정을 찾을 수 없습니다.' }, { status: 404 })
  }

  const [profileResult, workerResult] = await Promise.all([
    service
      .from('profiles')
      .select('name, phone, email')
      .eq('id', business.profile_id)
      .maybeSingle(),
    service
      .from('workers')
      .select('account_bank, account_number, birthdate')
      .eq('profile_id', business.profile_id)
      .maybeSingle(),
  ])

  const profileData = profileResult.data
  const result: AccountDetail = {
    business: {
      id: business.id,
      profile_id: business.profile_id,
      business_name: business.business_name,
      registration_number: business.registration_number ?? null,
      address: business.address ?? null,
      representative_name: business.representative_name ?? null,
      plan: business.plan ?? 'free',
      plan_expires_at: business.plan_expires_at ?? null,
      created_at: business.created_at,
    },
    profile: profileData ? {
      name: profileData.name,
      phone: profileData.phone,
      email: (profileData as { name: string; phone: string; email?: string | null }).email ?? null,
    } : null,
    worker: workerResult.data ?? null,
  }

  return NextResponse.json({ success: true, data: result })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<null>>> {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const isAdmin = await checkAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const service = createServiceClient()

  // businesses 테이블에서 profile_id 조회
  const { data: business, error: fetchError } = await service
    .from('businesses')
    .select('id, profile_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
  }

  if (!business) {
    return NextResponse.json({ success: false, error: '계정을 찾을 수 없습니다.' }, { status: 404 })
  }

  const bodyRecord = body as Record<string, unknown>

  // business 허용 필드
  const ALLOWED_BUSINESS = [
    'business_name',
    'registration_number',
    'address',
    'representative_name',
    'plan',
    'plan_expires_at',
  ] as const

  const businessUpdates: Record<string, unknown> = {}
  for (const key of ALLOWED_BUSINESS) {
    if (key in bodyRecord) businessUpdates[key] = bodyRecord[key]
  }

  if (Object.keys(businessUpdates).length > 0) {
    // plan 변경 시 plan_type도 동기화
    if ('plan' in businessUpdates) {
      businessUpdates['plan_type'] = businessUpdates['plan']
    }

    const { error } = await service
      .from('businesses')
      .update(businessUpdates)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
  }

  // profile 허용 필드
  const ALLOWED_PROFILE = ['name', 'phone', 'email'] as const

  const profileUpdates: Record<string, unknown> = {}
  for (const key of ALLOWED_PROFILE) {
    if (key in bodyRecord) profileUpdates[key] = bodyRecord[key]
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await service
      .from('profiles')
      .update(profileUpdates)
      .eq('id', business.profile_id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
  }

  // 이메일 변경 시 Auth 유저에도 동기화
  if ('email' in bodyRecord && typeof bodyRecord.email === 'string' && bodyRecord.email) {
    const { error: authUpdateError } = await service.auth.admin.updateUserById(
      business.profile_id,
      { email: bodyRecord.email },
    )
    if (authUpdateError) {
      return NextResponse.json({ success: false, error: authUpdateError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, data: null })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<null>>> {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const isAdmin = await checkAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const service = createServiceClient()

  const { data: business, error: fetchError } = await service
    .from('businesses')
    .select('id, profile_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
  }

  if (!business) {
    return NextResponse.json({ success: false, error: '계정을 찾을 수 없습니다.' }, { status: 404 })
  }

  const profileId = business.profile_id

  const { error: bizDeleteError } = await service
    .from('businesses')
    .delete()
    .eq('id', id)

  if (bizDeleteError) {
    return NextResponse.json({ success: false, error: bizDeleteError.message }, { status: 500 })
  }

  const { error: profileDeleteError } = await service
    .from('profiles')
    .delete()
    .eq('id', profileId)

  if (profileDeleteError) {
    return NextResponse.json({ success: false, error: profileDeleteError.message }, { status: 500 })
  }

  const { error: authDeleteError } = await service.auth.admin.deleteUser(profileId)

  if (authDeleteError) {
    return NextResponse.json({ success: false, error: authDeleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: null })
}
