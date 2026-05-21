import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE  = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES  = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
const BUCKET_NAME    = 'quote-pdfs'

// ─── POST: 파일 업로드 → 템플릿 생성 ────────────────────────────

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

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: '파일 파싱 실패' }, { status: 400 })
  }

  const file = formData.get('file')
  const name = (formData.get('name') as string | null)?.trim()
  const description = (formData.get('description') as string | null)?.trim() ?? null

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: '템플릿 이름은 필수입니다' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '허용된 파일 형식: PDF, PNG, JPEG, WEBP' }, { status: 400 })
  }

  const ext      = file.name.split('.').pop() ?? 'bin'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const filePath = `contract-templates/${biz.id}/${fileName}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await service.storage
    .from(BUCKET_NAME)
    .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: `파일 업로드 실패: ${uploadError.message}` }, { status: 500 })
  }

  const { data: urlData } = service.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)
  const fileUrl = urlData.publicUrl

  const { data, error } = await service.schema('ilitda')
    .from('contract_templates')
    .insert({
      business_id:   biz.id,
      name,
      description,
      html_body:     '',
      is_active:     true,
      var_config:    null,
      template_type: 'upload',
      file_url:      fileUrl,
    })
    .select()
    .single()

  if (error) {
    // 템플릿 저장 실패 시 업로드 파일 정리
    await service.storage.from(BUCKET_NAME).remove([filePath])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ template: data }, { status: 201 })
}
