import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, PanelConfig } from '@/types'

const EMPTY: PanelConfig = { fields: {} }

export async function GET(): Promise<NextResponse<ApiResponse<PanelConfig>>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: biz, error: bizError } = await service
    .schema('ilitda')
    .from('businesses')
    .select('panel_config')
    .eq('profile_id', user.id)
    .maybeSingle()

  // panel_config 컬럼이 아직 없는 경우(마이그레이션 미실행) 빈 설정으로 응답
  if (bizError && (bizError as { code?: string }).code === '42703') {
    return NextResponse.json({ success: true, data: EMPTY })
  }

  const raw = biz?.panel_config as PanelConfig | undefined
  const data: PanelConfig = raw?.fields ? raw : EMPTY
  return NextResponse.json({ success: true, data })
}

export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })
  }

  let body: PanelConfig
  try {
    body = await req.json() as PanelConfig
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 형식입니다' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .schema('ilitda')
    .from('businesses')
    .update({ panel_config: body })
    .eq('profile_id', user.id)

  if (error) {
    // panel_config 컬럼이 아직 없는 경우(마이그레이션 미실행) 성공으로 응답
    if ((error as { code?: string }).code === '42703') {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
