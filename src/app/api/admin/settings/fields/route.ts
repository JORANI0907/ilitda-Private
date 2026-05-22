import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_FORM_CONFIG } from '@/lib/settings-defaults'
import type { ApiResponse, FormConfig, PanelConfig } from '@/types'

interface FieldsConfig {
  formConfig: FormConfig
  panelConfig: PanelConfig
}

const EMPTY_PANEL: PanelConfig = { fields: {} }

function mergeFormConfig(saved: FormConfig | null): FormConfig {
  return {
    ...DEFAULT_FORM_CONFIG,
    ...(saved ?? {}),
    show_fields: {
      ...DEFAULT_FORM_CONFIG.show_fields,
      ...(saved?.show_fields ?? {}),
    },
  }
}

export async function GET(): Promise<NextResponse<ApiResponse<FieldsConfig>>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: biz, error: bizError } = await service
    .schema('ilitda')
    .from('businesses')
    .select('form_config, panel_config')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (bizError && (bizError as { code?: string }).code === '42703') {
    return NextResponse.json({
      success: true,
      data: { formConfig: mergeFormConfig(null), panelConfig: EMPTY_PANEL },
    })
  }

  const formConfig = mergeFormConfig(biz?.form_config as FormConfig | null)
  const raw = biz?.panel_config as PanelConfig | undefined
  const panelConfig: PanelConfig = raw?.fields ? raw : EMPTY_PANEL

  return NextResponse.json({ success: true, data: { formConfig, panelConfig } })
}

export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })
  }

  let body: FieldsConfig
  try {
    body = await req.json() as FieldsConfig
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 형식입니다' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .schema('ilitda')
    .from('businesses')
    .update({ form_config: body.formConfig, panel_config: body.panelConfig })
    .eq('profile_id', user.id)

  if (error) {
    if ((error as { code?: string }).code === '42703') {
      const { error: formErr } = await service
        .schema('ilitda')
        .from('businesses')
        .update({ form_config: body.formConfig })
        .eq('profile_id', user.id)
      if (formErr) {
        return NextResponse.json({ success: false, error: formErr.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
