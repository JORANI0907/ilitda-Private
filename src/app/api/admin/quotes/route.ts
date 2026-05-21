import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'))
  const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const search = searchParams.get('search')?.trim() || ''
  const offset = (page - 1) * limit

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const service = createServiceClient()
  const { data: biz } = await service.schema('ilitda').from('businesses')
    .select('id').eq('profile_id', user.id).maybeSingle()
  if (!biz) return NextResponse.json({ error: '사업자 정보 없음' }, { status: 403 })

  let query = service.schema('ilitda')
    .from('service_applications')
    .select(
      'id, owner_name, business_name, phone, email, address, construction_date, last_quote_no, last_quote_pdf_url, quote_items, quote_log, quote_notes, created_at, status, assigned_connection_ids',
      { count: 'exact' }
    )
    .eq('business_id', biz.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(
      `owner_name.ilike.%${search}%,business_name.ilike.%${search}%,phone.ilike.%${search}%`
    )
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ applications: data, total: count ?? 0, page, limit })
}
