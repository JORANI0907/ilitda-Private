import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

interface QuoteItem {
  name: string
  qty: number
  unit_price: number
  subtotal: number
}

interface QuoteDraftBody {
  quote_items?: QuoteItem[]
  quote_notes?: string
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body: QuoteDraftBody = await req.json()

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const service = createServiceClient()
  const { data: biz } = await service.schema('ilitda').from('businesses')
    .select('id').eq('profile_id', user.id).maybeSingle()
  if (!biz) return NextResponse.json({ error: '사업자 정보 없음' }, { status: 403 })

  try {
    const patch: Record<string, unknown> = {}
    if (body.quote_items !== undefined) patch.quote_items = body.quote_items
    if (body.quote_notes !== undefined) patch.quote_notes = body.quote_notes

    if (Object.keys(patch).length === 0) return NextResponse.json({ success: true })

    const { error } = await service.schema('ilitda')
      .from('service_applications')
      .update(patch)
      .eq('id', id)
      .eq('business_id', biz.id)

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '저장 실패' }, { status: 500 })
  }
}
