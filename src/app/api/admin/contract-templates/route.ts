import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ─── 타입 ────────────────────────────────────────────────────────

interface CreateTemplateBody {
  name: string
  description?: string
  html_body?: string
  is_active?: boolean
  var_config?: Record<string, unknown>
}

// ─── GET: 템플릿 목록 조회 ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const isActiveParam = searchParams.get('is_active')

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: biz } = await service.schema('ilitda').from('businesses')
    .select('id').eq('profile_id', user.id).maybeSingle()
  if (!biz) {
    return NextResponse.json({ error: '사업자 정보 없음' }, { status: 403 })
  }

  let query = service.schema('ilitda')
    .from('contract_templates')
    .select('id, name, description, template_type, file_url, is_active, var_config, created_at, updated_at')
    .eq('business_id', biz.id)
    .order('created_at', { ascending: false })

  if (isActiveParam === 'true') {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ templates: data ?? [] })
}

// ─── POST: 텍스트 기반 템플릿 생성 ──────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: biz } = await service.schema('ilitda').from('businesses')
    .select('id').eq('profile_id', user.id).maybeSingle()
  if (!biz) {
    return NextResponse.json({ error: '사업자 정보 없음' }, { status: 403 })
  }

  let body: CreateTemplateBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: '템플릿 이름은 필수입니다' }, { status: 400 })
  }

  const { data, error } = await service.schema('ilitda')
    .from('contract_templates')
    .insert({
      business_id:   biz.id,
      name:          body.name.trim(),
      description:   body.description?.trim() ?? null,
      html_body:     body.html_body ?? null,
      is_active:     body.is_active ?? true,
      var_config:    body.var_config ?? null,
      template_type: 'text',
      file_url:      null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ template: data }, { status: 201 })
}
