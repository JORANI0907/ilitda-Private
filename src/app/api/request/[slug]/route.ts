import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_FORM_CONFIG, DEFAULT_PANEL_FIELDS } from '@/lib/settings-defaults'
import type { FormConfig, PanelConfig, PanelFieldOverride } from '@/types'

type RouteContext = { params: Promise<{ slug: string }> }

function strOrNull(v: unknown): string | null {
  return v && typeof v === 'string' ? v.trim() || null : null
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { slug } = await params

  const service = createServiceClient()

  const { data: business, error } = await service
    .from('businesses')
    .select('id, business_name, request_slug, form_config, panel_config')
    .eq('request_slug', slug)
    .maybeSingle()

  if (error || !business) {
    return NextResponse.json(
      { success: false, error: '존재하지 않는 신청 페이지입니다.' },
      { status: 404 },
    )
  }

  const saved = business.form_config as FormConfig | null
  const formConfig: FormConfig = {
    ...DEFAULT_FORM_CONFIG,
    ...(saved ?? {}),
    show_fields: {
      ...DEFAULT_FORM_CONFIG.show_fields,
      ...(saved?.show_fields ?? {}),
    },
  }

  const panelConfig = business.panel_config as PanelConfig | null
  const panelFields = panelConfig?.fields ?? {}

  const customFieldDefs = (formConfig.custom_form_fields ?? [])
    .map(key => {
      const def = DEFAULT_PANEL_FIELDS.find(f => f.key === key)
      if (!def) return null
      const override = panelFields[key] as PanelFieldOverride | undefined
      return {
        key,
        label: override?.label ?? def.label,
        placeholder: override?.placeholder ?? def.placeholder,
      }
    })
    .filter(Boolean)

  return NextResponse.json({
    success: true,
    data: {
      businessName: business.business_name,
      slug: business.request_slug,
      formConfig,
      customFieldDefs,
    },
  })
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { slug } = await params

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const b = body as Record<string, unknown>

  const {
    client_name,
    client_phone,
    client_address,
    desired_date,
    desired_time,
    notes,
    owner_name,
    email,
    business_number,
    account_number,
    payment_method,
    elevator,
    parking,
    building_access,
    access_method,
    care_scope,
    custom_fields,
  } = b

  if (!client_name || typeof client_name !== 'string' || !client_name.trim()) {
    return NextResponse.json({ success: false, error: '업체명/이름을 입력해 주세요.' }, { status: 400 })
  }
  if (!client_phone || typeof client_phone !== 'string' || !client_phone.trim()) {
    return NextResponse.json({ success: false, error: '연락처를 입력해 주세요.' }, { status: 400 })
  }
  if (!client_address || typeof client_address !== 'string' || !client_address.trim()) {
    return NextResponse.json({ success: false, error: '주소를 입력해 주세요.' }, { status: 400 })
  }
  if (!care_scope || typeof care_scope !== 'string' || !care_scope.trim()) {
    return NextResponse.json({ success: false, error: '서비스 내용을 입력해 주세요.' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: business, error: bizError } = await service
    .from('businesses')
    .select('id, panel_config, form_config')
    .eq('request_slug', slug)
    .maybeSingle()

  if (bizError || !business) {
    return NextResponse.json(
      { success: false, error: '존재하지 않는 신청 페이지입니다.' },
      { status: 404 },
    )
  }

  let finalNotes = strOrNull(notes)
  if (custom_fields && typeof custom_fields === 'object') {
    const pConf = business.panel_config as PanelConfig | null
    const pFields = pConf?.fields ?? {}
    const fConf = business.form_config as FormConfig | null
    const enabledKeys = fConf?.custom_form_fields ?? []
    const lines: string[] = []
    for (const key of enabledKeys) {
      const val = (custom_fields as Record<string, string>)[key]
      if (!val || !String(val).trim()) continue
      const def = DEFAULT_PANEL_FIELDS.find(f => f.key === key)
      const override = pFields[key] as PanelFieldOverride | undefined
      const label = override?.label ?? def?.label ?? key
      lines.push(`${label}: ${String(val).trim()}`)
    }
    if (lines.length > 0) {
      const appendix = `\n[추가 정보]\n${lines.join('\n')}`
      finalNotes = finalNotes ? finalNotes + appendix : appendix.trim()
    }
  }

  const { error } = await service.from('service_applications').insert({
    business_name:     (client_name as string).trim(),
    phone:             (client_phone as string).trim(),
    address:           (client_address as string).trim(),
    construction_date: strOrNull(desired_date),
    construction_time: strOrNull(desired_time),
    request_notes:     finalNotes,
    status:            '신규',
    owner_name:        strOrNull(owner_name),
    email:             strOrNull(email),
    business_number:   strOrNull(business_number),
    account_number:    strOrNull(account_number),
    payment_method:    strOrNull(payment_method),
    elevator:          strOrNull(elevator),
    parking:           strOrNull(parking),
    building_access:   strOrNull(building_access),
    access_method:     strOrNull(access_method),
    care_scope:        strOrNull(care_scope),
  })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
