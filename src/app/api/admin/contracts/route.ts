import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ─── 타입 ────────────────────────────────────────────────────────

interface CreateContractBody {
  application_id:  string
  template_id:     string
  customer_phone:  string
  monthly_price:   number
  annual_price:    number
  start_date:      string
  end_date:        string
  selected_items?: string[]
}

// ─── GET: 계약서 목록 조회 ───────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? ''

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
    .from('contracts')
    .select(`
      id,
      signing_status,
      monthly_price,
      annual_price,
      start_date,
      end_date,
      customer_phone,
      template_id,
      created_at,
      updated_at,
      service_applications!inner(
        owner_name,
        business_name
      )
    `)
    .eq('business_id', biz.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('signing_status', status)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ contracts: data ?? [] })
}

// ─── POST: 계약서 생성 ───────────────────────────────────────────

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

  let body: CreateContractBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  }

  if (!body.application_id || !body.template_id || !body.customer_phone) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 })
  }

  // 신청서 소유권 검증
  const { data: app } = await service.schema('ilitda')
    .from('service_applications')
    .select('id')
    .eq('id', body.application_id)
    .eq('business_id', biz.id)
    .maybeSingle()
  if (!app) {
    return NextResponse.json({ error: '신청서를 찾을 수 없습니다' }, { status: 404 })
  }

  // 템플릿 조회 (소유권 + html_body 스냅샷)
  const { data: template } = await service.schema('ilitda')
    .from('contract_templates')
    .select('id, html_body, name, template_type, file_url')
    .eq('id', body.template_id)
    .eq('business_id', biz.id)
    .maybeSingle()
  if (!template) {
    return NextResponse.json({ error: '템플릿을 찾을 수 없습니다' }, { status: 404 })
  }

  const tokenExpiresAt = new Date()
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30)

  const { data, error } = await service.schema('ilitda')
    .from('contracts')
    .insert({
      business_id:       biz.id,
      application_id:    body.application_id,
      template_id:       body.template_id,
      customer_phone:    body.customer_phone,
      monthly_price:     body.monthly_price,
      annual_price:      body.annual_price,
      start_date:        body.start_date,
      end_date:          body.end_date,
      selected_items:    body.selected_items ?? [],
      contract_snapshot: {
        html_body:     template.html_body,
        template_name: template.name,
        template_type: template.template_type,
        file_url:      template.file_url,
      },
      signing_status:  'draft',
      token_expires_at: tokenExpiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ contract: data }, { status: 201 })
}
