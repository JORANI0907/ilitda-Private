import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type AppRow = {
  id: string
  construction_date: string
  status: string
  care_scope: string | null
  supply_amount: string | number | null
  business_name: string | null
  owner_name: string | null
  business_number: string | null
  payment_method: string | null
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: business } = await service
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const url = req.nextUrl
  const year  = Number(url.searchParams.get('year') ?? new Date().getFullYear())
  const monthParam = url.searchParams.get('month')

  if (monthParam) {
    // ─── 월간 데이터 ───────────────────────────────────────
    const month = Number(monthParam)
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end   = new Date(year, month, 0).toISOString().slice(0, 10)

    const { data: rows } = await service
      .from('service_applications')
      .select('id, construction_date, status, care_scope, supply_amount, business_name, owner_name, business_number, payment_method')
      .eq('business_id', business.id)
      .gte('construction_date', start)
      .lte('construction_date', end)
      .not('construction_date', 'is', null)
      .neq('status', '예약취소')
      .order('construction_date', { ascending: false })

    const schedules = ((rows ?? []) as AppRow[]).map(s => ({
      id:           s.id,
      service_date: s.construction_date,
      service_type: s.care_scope,
      fee:          s.supply_amount !== null ? Number(s.supply_amount) : null,
      status:       s.status,
      client: {
        name:           s.business_name ?? '-',
        owner_name:     s.owner_name,
        business_number:s.business_number,
        payment_method: s.payment_method,
      },
    }))

    const total = schedules.reduce((sum, s) => sum + (s.fee ?? 0), 0)

    const methodMap: Record<string, number> = {}
    for (const s of schedules) {
      const method = s.client?.payment_method ?? '미지정'
      methodMap[method] = (methodMap[method] ?? 0) + (s.fee ?? 0)
    }

    const byPaymentMethod = Object.entries(methodMap)
      .map(([method, amount]) => ({
        method,
        amount,
        percent: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    return NextResponse.json({ success: true, data: { total, byPaymentMethod, schedules } })
  } else {
    // ─── 연간 데이터 ───────────────────────────────────────
    const { data: rows } = await service
      .from('service_applications')
      .select('construction_date, supply_amount')
      .eq('business_id', business.id)
      .gte('construction_date', `${year}-01-01`)
      .lte('construction_date', `${year}-12-31`)
      .not('construction_date', 'is', null)
      .neq('status', '예약취소')

    const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0 }))
    for (const s of (rows ?? [])) {
      const m = new Date(s.construction_date as string).getMonth()
      months[m].total += Number((s.supply_amount as string | number | null) ?? 0)
    }

    const total = months.reduce((sum, m) => sum + m.total, 0)
    return NextResponse.json({ success: true, data: { year, total, months } })
  }
}
