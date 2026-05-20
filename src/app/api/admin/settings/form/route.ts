import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_FORM_CONFIG } from '@/lib/settings-defaults'
import type { ApiResponse, FormConfig } from '@/types'

export async function GET(): Promise<NextResponse<ApiResponse<FormConfig>>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: biz } = await service
    .schema('ilitda')
    .from('businesses')
    .select('form_config')
    .eq('profile_id', user.id)
    .maybeSingle()

  const saved = biz?.form_config as FormConfig | null
  const config: FormConfig = {
    ...DEFAULT_FORM_CONFIG,
    ...(saved ?? {}),
    show_fields: {
      ...DEFAULT_FORM_CONFIG.show_fields,
      ...(saved?.show_fields ?? {}),
    },
  }

  return NextResponse.json({ success: true, data: config })
}

export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })
  }

  let body: Partial<FormConfig>
  try {
    body = await req.json() as Partial<FormConfig>
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 형식입니다' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .schema('ilitda')
    .from('businesses')
    .update({ form_config: body })
    .eq('profile_id', user.id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
