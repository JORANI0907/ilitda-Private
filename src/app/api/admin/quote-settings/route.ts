import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DEFAULTS = {
  company_name:    '',
  company_ceo:     '',
  company_biz_no:  '',
  company_phone:   '',
  company_address: '',
  valid_days:      5,
  seal_image_url:  null as string | null,
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const service = createServiceClient()
  const { data: biz } = await service.schema('ilitda').from('businesses')
    .select('id').eq('profile_id', user.id).maybeSingle()
  if (!biz) return NextResponse.json({ error: '사업자 정보 없음' }, { status: 403 })

  const { data } = await service.schema('ilitda')
    .from('quote_settings')
    .select('*')
    .eq('business_id', biz.id)
    .maybeSingle()

  return NextResponse.json(data ?? { ...DEFAULTS, business_id: biz.id })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const service = createServiceClient()
  const { data: biz } = await service.schema('ilitda').from('businesses')
    .select('id').eq('profile_id', user.id).maybeSingle()
  if (!biz) return NextResponse.json({ error: '사업자 정보 없음' }, { status: 403 })

  const { error } = await service.schema('ilitda')
    .from('quote_settings')
    .upsert({
      business_id:     biz.id,
      company_name:    body.company_name    ?? DEFAULTS.company_name,
      company_ceo:     body.company_ceo     ?? DEFAULTS.company_ceo,
      company_biz_no:  body.company_biz_no  ?? DEFAULTS.company_biz_no,
      company_phone:   body.company_phone   ?? DEFAULTS.company_phone,
      company_address: body.company_address ?? DEFAULTS.company_address,
      valid_days:      body.valid_days      ?? DEFAULTS.valid_days,
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'business_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
