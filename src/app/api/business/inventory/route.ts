import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const DEMO_INVENTORY = [
  { id: 'demo-inv-1', name: '탈지제 (20L)',          current_qty: 3,  min_qty: 5,  unit: '통', category: '세제류' },
  { id: 'demo-inv-2', name: '스팀청소기',              current_qty: 2,  min_qty: 2,  unit: '대', category: '장비' },
  { id: 'demo-inv-3', name: '후드세정제 (5L)',         current_qty: 8,  min_qty: 3,  unit: '통', category: '세제류' },
  { id: 'demo-inv-4', name: '고압세척기 호스',         current_qty: 1,  min_qty: 2,  unit: '개', category: '장비' },
  { id: 'demo-inv-5', name: '마이크로파이버 걸레',     current_qty: 15, min_qty: 10, unit: '장', category: '소모품' },
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: true, data: DEMO_INVENTORY, isDemo: true })
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

  const { data, error } = await service
    .from('inventory')
    .select('*')
    .eq('business_id', business.id)
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const { name, unit, min_qty, category } = body as Record<string, unknown>
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ success: false, error: '재고명을 입력해 주세요.' }, { status: 400 })
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

  const { data, error } = await service
    .from('inventory')
    .insert({
      business_id: business.id,
      name: name.trim(),
      unit: unit && typeof unit === 'string' ? unit.trim() || null : null,
      current_qty: 0,
      min_qty: min_qty && !isNaN(Number(min_qty)) ? Number(min_qty) : null,
      category: category && typeof category === 'string' && category.trim() ? category.trim() : '기타',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
