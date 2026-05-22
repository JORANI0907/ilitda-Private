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

const DEMO_REVENUE = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m0 = now.getMonth()         // 0-based 이번달
  const m1 = m0 === 0 ? 11 : m0 - 1  // 지난달
  const m2 = m1 === 0 ? 11 : m1 - 1  // 전전달
  const y1 = m0 === 0 ? y - 1 : y
  const y2 = m1 === 0 ? y - 1 : y1

  const pad = (n: number) => String(n + 1).padStart(2, '0')

  const months = Array.from({ length: 12 }, (_, i) => {
    if (i === m0) return { month: i + 1, total: 2450000 }
    if (i === m1) return { month: i + 1, total: 3120000 }
    if (i === m2) return { month: i + 1, total: 1980000 }
    return { month: i + 1, total: 0 }
  })

  const schedules = [
    { id: 'demo-rev-1', service_date: `${y}-${pad(m0)}-05`, service_type: '주방후드 청소', fee: 350000, status: '서비스완료', client: { name: '스타벅스 강남역점', owner_name: '김대현', business_number: null, payment_method: '현금(세금계산서)' } },
    { id: 'demo-rev-2', service_date: `${y}-${pad(m0)}-03`, service_type: '에어컨 청소', fee: 280000, status: '결제완료', client: { name: '맥도날드 역삼점', owner_name: '이민준', business_number: null, payment_method: '카드결제' } },
    { id: 'demo-rev-3', service_date: `${y}-${pad(m0)}-12`, service_type: '바닥 청소', fee: 220000, status: '서비스완료', client: { name: '이디야 선릉점', owner_name: '박서연', business_number: null, payment_method: '현금(세금계산서)' } },
    { id: 'demo-rev-4', service_date: `${y}-${pad(m0)}-15`, service_type: '덕트 청소', fee: 380000, status: '예약확정', client: { name: '버거킹 삼성점', owner_name: '최지원', business_number: null, payment_method: null } },
    { id: 'demo-rev-5', service_date: `${y1}-${pad(m1)}-28`, service_type: '식기세척기 청소', fee: 310000, status: '결제완료', client: { name: '롯데리아 잠실점', owner_name: '정수현', business_number: null, payment_method: '카드결제' } },
    { id: 'demo-rev-6', service_date: `${y1}-${pad(m1)}-20`, service_type: '주방후드 청소', fee: 350000, status: '결제완료', client: { name: 'BBQ 강동점', owner_name: '한지훈', business_number: null, payment_method: '현금(세금계산서)' } },
    { id: 'demo-rev-7', service_date: `${y2}-${pad(m2)}-15`, service_type: '주방후드 청소', fee: 320000, status: '결제완료', client: { name: '파리바게뜨 성수점', owner_name: '윤소희', business_number: null, payment_method: '카드결제' } },
  ]

  return { months, schedules, y }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const { months, schedules, y } = DEMO_REVENUE()
    const urlYear  = Number(new URL(req.url).searchParams.get('year') ?? y)
    const monthParam = new URL(req.url).searchParams.get('month')

    if (monthParam) {
      const monthNum = Number(monthParam)
      const monthSchedules = schedules.filter(s => {
        const sm = new Date(s.service_date).getMonth() + 1
        const sy = new Date(s.service_date).getFullYear()
        return sy === urlYear && sm === monthNum
      })
      const total = monthSchedules.reduce((sum, s) => sum + (s.fee ?? 0), 0)
      const methodMap: Record<string, number> = {}
      for (const s of monthSchedules) {
        const method = s.client?.payment_method ?? '미지정'
        methodMap[method] = (methodMap[method] ?? 0) + (s.fee ?? 0)
      }
      const byPaymentMethod = Object.entries(methodMap)
        .map(([method, amount]) => ({ method, amount, percent: total > 0 ? Math.round((amount / total) * 100) : 0 }))
        .sort((a, b) => b.amount - a.amount)
      return NextResponse.json({ success: true, data: { total, byPaymentMethod, schedules: monthSchedules }, isDemo: true })
    }

    const total = months.reduce((sum, m) => sum + m.total, 0)
    return NextResponse.json({ success: true, data: { year: urlYear, total, months }, isDemo: true })
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
