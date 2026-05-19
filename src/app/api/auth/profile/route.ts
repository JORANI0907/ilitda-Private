import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, Profile, Business, Worker, ActiveRole } from '@/types'

// ─── POST body 타입 ───────────────────────────────────────────

interface BusinessInput {
  business_name: string
  registration_number?: string | null
  address?: string | null
  representative_name?: string | null
}

interface WorkerInput {
  birthdate?: string | null
  account_bank?: string | null
  account_number?: string | null
  available_regions?: string[]
  certifications?: string[]
  experience_years?: number
}

interface CreateProfileBody {
  name: string
  active_role: ActiveRole
  is_business: boolean
  is_worker: boolean
  business?: BusinessInput
  worker?: WorkerInput
}

interface PATCH_Body {
  active_role?: ActiveRole
}

interface ProfileData {
  profile: Profile
  business: Business | null
  worker: Worker | null
}

// ─── GET: 세션 기반 프로필 + business + worker 조회 ───────────

export async function GET(): Promise<NextResponse<ApiResponse<ProfileData>>> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: '인증이 필요합니다' },
      { status: 401 }
    )
  }

  const serviceClient = createServiceClient()

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json(
      { success: false, error: '프로필 조회에 실패했습니다' },
      { status: 500 }
    )
  }
  if (!profile) {
    return NextResponse.json(
      { success: false, error: '프로필을 찾을 수 없습니다' },
      { status: 404 }
    )
  }

  const [bizResult, workerResult] = await Promise.all([
    profile.is_business
      ? serviceClient.from('businesses').select('*').eq('profile_id', user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    profile.is_worker
      ? serviceClient.from('workers').select('*').eq('profile_id', user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      profile: profile as Profile,
      business: (bizResult.data as Business | null),
      worker: (workerResult.data as Worker | null),
    },
  })
}

// ─── POST: 신규 프로필 생성 (가입 설정 완료) ─────────────────

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Profile>>> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: '인증이 필요합니다' },
      { status: 401 }
    )
  }

  let body: CreateProfileBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: '잘못된 요청 형식입니다' },
      { status: 400 }
    )
  }

  const { name, active_role, is_business, is_worker, business, worker } = body

  if (!name?.trim()) {
    return NextResponse.json(
      { success: false, error: '이름은 필수 항목입니다' },
      { status: 400 }
    )
  }
  if (active_role !== 'business' && active_role !== 'worker') {
    return NextResponse.json(
      { success: false, error: 'active_role은 business 또는 worker이어야 합니다' },
      { status: 400 }
    )
  }
  if (!is_business && !is_worker) {
    return NextResponse.json(
      { success: false, error: '역할을 하나 이상 선택해주세요' },
      { status: 400 }
    )
  }
  if (is_business && !business?.business_name?.trim()) {
    return NextResponse.json(
      { success: false, error: '사업자 등록 시 상호명이 필요합니다' },
      { status: 400 }
    )
  }

  const serviceClient = createServiceClient()

  // user.phone은 Supabase Auth에서 전화번호 포함
  const phone = user.phone ?? ''

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .insert({
      id: user.id,
      phone,
      name: name.trim(),
      active_role,
      is_business,
      is_worker,
    })
    .select()
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { success: false, error: '프로필 생성에 실패했습니다' },
      { status: 500 }
    )
  }

  if (is_business && business) {
    const slug = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    const { error: bizError } = await serviceClient.from('businesses').insert({
      profile_id: user.id,
      business_name: business.business_name.trim(),
      registration_number: business.registration_number ?? null,
      address: business.address ?? null,
      representative_name: business.representative_name ?? null,
      request_slug: slug,
    })
    if (bizError) {
      return NextResponse.json(
        { success: false, error: '사업자 프로필 생성에 실패했습니다' },
        { status: 500 }
      )
    }
  }

  if (is_worker) {
    const { error: workerError } = await serviceClient.from('workers').insert({
      profile_id: user.id,
      birthdate: worker?.birthdate ?? null,
      account_bank: worker?.account_bank ?? null,
      account_number: worker?.account_number ?? null,
      available_regions: worker?.available_regions ?? [],
      certifications: worker?.certifications ?? [],
      experience_years: worker?.experience_years ?? 0,
    })
    if (workerError) {
      return NextResponse.json(
        { success: false, error: '용역자 프로필 생성에 실패했습니다' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json(
    { success: true, data: profile as Profile },
    { status: 201 }
  )
}

// ─── PATCH: active_role 변경 ──────────────────────────────────

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: '인증이 필요합니다' },
      { status: 401 }
    )
  }

  let body: PATCH_Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: '잘못된 요청 형식입니다' },
      { status: 400 }
    )
  }

  const ALLOWED = ['active_role'] as const
  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { success: false, error: '변경할 항목이 없습니다' },
      { status: 400 }
    )
  }

  const serviceClient = createServiceClient()
  const { error: updateError } = await serviceClient
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json(
      { success: false, error: '프로필 업데이트에 실패했습니다' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
