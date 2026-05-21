import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const service = createServiceClient()
  const { data: biz } = await service.schema('ilitda').from('businesses')
    .select('id').eq('profile_id', user.id).maybeSingle()
  if (!biz) return NextResponse.json({ error: '사업자 정보 없음' }, { status: 403 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: '2MB 이하 파일만 허용됩니다.' }, { status: 400 })

    const validTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'PNG, JPG, WEBP만 허용됩니다.' }, { status: 400 })
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp'
    const fileName = `seal/${biz.id}/company-seal.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await service.storage
      .from('quote-pdfs')
      .upload(fileName, buffer, { contentType: file.type, upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const { data: urlData } = service.storage.from('quote-pdfs').getPublicUrl(fileName)

    const { error: dbError } = await service.schema('ilitda')
      .from('quote_settings')
      .upsert({
        business_id:    biz.id,
        seal_image_url: urlData.publicUrl,
        updated_at:     new Date().toISOString(),
      }, { onConflict: 'business_id' })

    if (dbError) throw new Error(dbError.message)

    return NextResponse.json({ success: true, seal_url: urlData.publicUrl })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '업로드 실패' }, { status: 500 })
  }
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const service = createServiceClient()
  const { data: biz } = await service.schema('ilitda').from('businesses')
    .select('id').eq('profile_id', user.id).maybeSingle()
  if (!biz) return NextResponse.json({ error: '사업자 정보 없음' }, { status: 403 })

  try {
    await service.storage.from('quote-pdfs').remove([
      `seal/${biz.id}/company-seal.png`,
      `seal/${biz.id}/company-seal.jpg`,
      `seal/${biz.id}/company-seal.webp`,
    ])

    const { error } = await service.schema('ilitda')
      .from('quote_settings')
      .update({ seal_image_url: null, updated_at: new Date().toISOString() })
      .eq('business_id', biz.id)

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '삭제 실패' }, { status: 500 })
  }
}
