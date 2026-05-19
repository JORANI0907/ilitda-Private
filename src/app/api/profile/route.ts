import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const service = createServiceClient()

  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json(
      { success: false, error: '프로필 정보를 찾을 수 없습니다.' },
      { status: 404 },
    )
  }

  // 사업자/용역자 데이터 병렬 조회
  const [bizResult, workerResult] = await Promise.all([
    profile.is_business
      ? service.from('businesses').select('*').eq('profile_id', user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    profile.is_worker
      ? service.from('workers').select('*').eq('profile_id', user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      profile,
      business: bizResult.data ?? null,
      worker: workerResult.data ?? null,
    },
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const service = createServiceClient()

  // 사업자 request_slug 수정
  const ALLOWED_BUSINESS = ['request_slug'] as const
  const businessUpdates: Record<string, unknown> = {}
  for (const key of ALLOWED_BUSINESS) {
    if (key in (body as Record<string, unknown>)) {
      businessUpdates[key] = (body as Record<string, unknown>)[key]
    }
  }

  if (Object.keys(businessUpdates).length > 0) {
    const { data: biz } = await service
      .from('businesses')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (biz) {
      const { error } = await service
        .from('businesses')
        .update(businessUpdates)
        .eq('id', biz.id)

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
    }
  }

  const ALLOWED_PROFILE = ['name', 'phone'] as const
  const profileUpdates: Record<string, unknown> = {}
  for (const key of ALLOWED_PROFILE) {
    if (key in (body as Record<string, unknown>)) {
      profileUpdates[key] = (body as Record<string, unknown>)[key]
    }
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await service
      .from('profiles')
      .update(profileUpdates)
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
  }

  // 용역자 정보 수정
  const ALLOWED_WORKER = ['account_bank', 'account_number', 'available_regions'] as const
  const workerUpdates: Record<string, unknown> = {}
  for (const key of ALLOWED_WORKER) {
    if (key in (body as Record<string, unknown>)) {
      workerUpdates[key] = (body as Record<string, unknown>)[key]
    }
  }

  if (Object.keys(workerUpdates).length > 0) {
    const { data: worker } = await service
      .from('workers')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (worker) {
      const { error } = await service
        .from('workers')
        .update(workerUpdates)
        .eq('id', worker.id)

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ success: true })
}
