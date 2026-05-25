import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

const DEMO_QUOTES = () => {
  const now = new Date().toISOString().slice(0, 10)
  return [
    {
      id: 'demo-quote-1', owner_name: '신세계 강남점 담당자', business_name: '신세계 강남점',
      phone: '02-1234-5678', email: 'ssg@example.com', address: '서울 강남구 신세계로 100',
      construction_date: null, last_quote_no: 'ILT-0001', last_quote_pdf_url: null,
      quote_items: [{ name: '주방후드 청소', qty: 1, unit_price: 450000, subtotal: 450000 }],
      quote_log: [{ quote_no: 'ILT-0001', pdf_url: null, sent_at: now, total_amount: 495000 }],
      quote_notes: null, created_at: now, status: '견적발송', assigned_connection_ids: [],
    },
    {
      id: 'demo-quote-2', owner_name: '현대백화점 압구정 담당자', business_name: '현대백화점 압구정점',
      phone: '02-2345-6789', email: null, address: '서울 강남구 압구정로 149',
      construction_date: null, last_quote_no: null, last_quote_pdf_url: null,
      quote_items: [{ name: '에어컨 청소 3대', qty: 3, unit_price: 126667, subtotal: 380000 }],
      quote_log: null, quote_notes: '영업시간 외 방문 필요', created_at: now, status: '신규', assigned_connection_ids: [],
    },
    {
      id: 'demo-quote-3', owner_name: '갤러리아 명품관 담당자', business_name: '갤러리아 명품관',
      phone: '02-3456-7890', email: 'galleria@example.com', address: '서울 강남구 압구정로 343',
      construction_date: null, last_quote_no: 'ILT-0002', last_quote_pdf_url: null,
      quote_items: [{ name: '덕트 청소', qty: 1, unit_price: 620000, subtotal: 620000 }],
      quote_log: [{ quote_no: 'ILT-0002', pdf_url: null, sent_at: now, total_amount: 682000 }],
      quote_notes: null, created_at: now, status: '결제완료', assigned_connection_ids: [],
    },
  ]
}

function nextMonthStr(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 1).padStart(2, '0')}-01`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'))
  const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const search = searchParams.get('search')?.trim() || ''
  const month  = searchParams.get('month')?.trim() || ''
  const offset = (page - 1) * limit

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    const demo = DEMO_QUOTES()
    const filtered = search
      ? demo.filter(q => q.owner_name.includes(search) || q.business_name.includes(search) || q.phone.includes(search))
      : demo
    return NextResponse.json({ applications: filtered, total: filtered.length, page, limit, isDemo: true })
  }

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

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    query = query
      .gte('created_at', `${month}-01`)
      .lt('created_at', nextMonthStr(month))
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ applications: data, total: count ?? 0, page, limit })
}
