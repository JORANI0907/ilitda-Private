import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

export type FeatureType = 'boolean' | 'numeric'
export type FeatureCategory = 'sms' | 'feature' | 'hr'

export interface PlanFeatureConfig {
  feature_key: string
  label: string
  category: FeatureCategory
  feature_type: FeatureType
  free_enabled: boolean | null
  basic_enabled: boolean | null
  pro_enabled: boolean | null
  max_enabled: boolean | null
  free_limit: number | null
  basic_limit: number | null
  pro_limit: number | null
  max_limit: number | null
  updated_at: string
}

interface PlanFeatureUpdate {
  feature_key: string
  free_enabled?: boolean
  basic_enabled?: boolean
  pro_enabled?: boolean
  max_enabled?: boolean
  free_limit?: number | null
  basic_limit?: number | null
  pro_limit?: number | null
  max_limit?: number | null
}

async function checkAdmin(userId: string): Promise<boolean> {
  const service = createServiceClient()
  const { data } = await service
    .schema('ilitda')
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle()
  return data?.is_admin === true
}

export async function GET(): Promise<NextResponse<ApiResponse<PlanFeatureConfig[]>>> {
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
  const { data, error } = await service
    .schema('ilitda')
    .from('plan_feature_configs')
    .select('*')
    .order('category')
    .order('feature_key')

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: (data ?? []) as PlanFeatureConfig[] })
}

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const isAdmin = await checkAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  let body: { configs: PlanFeatureUpdate[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  if (!Array.isArray(body?.configs) || body.configs.length === 0) {
    return NextResponse.json({ success: false, error: 'configs 배열이 필요합니다.' }, { status: 400 })
  }

  const ALLOWED_BOOLEAN_FIELDS = [
    'free_enabled',
    'basic_enabled',
    'pro_enabled',
    'max_enabled',
  ] as const

  const ALLOWED_NUMERIC_FIELDS = [
    'free_limit',
    'basic_limit',
    'pro_limit',
    'max_limit',
  ] as const

  const service = createServiceClient()

  for (const config of body.configs) {
    if (!config.feature_key) {
      return NextResponse.json({ success: false, error: 'feature_key가 누락되었습니다.' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    for (const key of ALLOWED_BOOLEAN_FIELDS) {
      if (key in config) updates[key] = config[key]
    }

    for (const key of ALLOWED_NUMERIC_FIELDS) {
      if (key in config) updates[key] = config[key] ?? null
    }

    const { error } = await service
      .schema('ilitda')
      .from('plan_feature_configs')
      .update(updates)
      .eq('feature_key', config.feature_key)

    if (error) {
      return NextResponse.json(
        { success: false, error: `${config.feature_key} 업데이트 실패: ${error.message}` },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ success: true, data: null })
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const isAdmin = await checkAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  let body: { feature_key: string; label: string; category: FeatureCategory; feature_type: FeatureType }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const { feature_key, label, category, feature_type } = body
  if (!feature_key || !label || !category || !feature_type) {
    return NextResponse.json({ success: false, error: '필수 항목이 누락되었습니다.' }, { status: 400 })
  }

  if (!/^[a-z][a-z0-9_]*$/.test(feature_key)) {
    return NextResponse.json({ success: false, error: 'feature_key는 소문자·숫자·밑줄만 허용됩니다.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .schema('ilitda')
    .from('plan_feature_configs')
    .insert({
      feature_key,
      label,
      category,
      feature_type,
      free_enabled:  false,
      basic_enabled: false,
      pro_enabled:   false,
      max_enabled:   false,
      free_limit:  null,
      basic_limit: null,
      pro_limit:   null,
      max_limit:   null,
    })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: '이미 존재하는 feature_key입니다.' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: null })
}
