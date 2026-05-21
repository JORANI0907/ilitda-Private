import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const BUCKET_NAME = 'quote-pdfs'

// ─── GET: 단건 조회 ──────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

  const { data, error } = await service.schema('ilitda')
    .from('contract_templates')
    .select('*')
    .eq('id', id)
    .eq('business_id', biz.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: '템플릿을 찾을 수 없습니다' }, { status: 404 })
  }

  return NextResponse.json({ template: data })
}

// ─── PUT: 수정 ───────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  }

  const ALLOWED = ['name', 'description', 'html_body', 'is_active', 'var_config']
  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: true })
  }

  updates.updated_at = new Date().toISOString()

  const { error } = await service.schema('ilitda')
    .from('contract_templates')
    .update(updates)
    .eq('id', id)
    .eq('business_id', biz.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// ─── DELETE: 실제 삭제 + Storage 파일도 삭제 ─────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

  // 먼저 템플릿 조회 (file_url 확인)
  const { data: template, error: fetchError } = await service.schema('ilitda')
    .from('contract_templates')
    .select('id, file_url, template_type')
    .eq('id', id)
    .eq('business_id', biz.id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!template) {
    return NextResponse.json({ error: '템플릿을 찾을 수 없습니다' }, { status: 404 })
  }

  // DB 삭제
  const { error } = await service.schema('ilitda')
    .from('contract_templates')
    .delete()
    .eq('id', id)
    .eq('business_id', biz.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Storage 파일 삭제 (업로드 타입인 경우)
  if (template.template_type === 'upload' && template.file_url) {
    try {
      const url      = new URL(template.file_url as string)
      const pathPart = url.pathname.split(`/${BUCKET_NAME}/`)[1]
      if (pathPart) {
        await service.storage.from(BUCKET_NAME).remove([pathPart])
      }
    } catch {
      // 스토리지 삭제 실패는 무시 (DB는 이미 삭제됨)
    }
  }

  return NextResponse.json({ success: true })
}
