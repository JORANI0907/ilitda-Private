import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const DEFAULT_CATEGORIES = ['약품', '장비', '소모품', '기타']

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data: business } = await service
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()
  return business ? { service, businessId: business.id } : null
}

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  const { service, businessId } = ctx

  let { data, error } = await service
    .from('inventory_categories')
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  // 처음 사용 시 기본 카테고리 자동 생성
  if (!data || data.length === 0) {
    const { data: seeded, error: seedError } = await service
      .from('inventory_categories')
      .insert(DEFAULT_CATEGORIES.map((name, i) => ({ business_id: businessId, name, sort_order: i })))
      .select()
    if (seedError) return NextResponse.json({ success: false, error: seedError.message }, { status: 500 })
    data = seeded
  }

  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  const { service, businessId } = ctx

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }
  const { name } = body as Record<string, unknown>
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ success: false, error: '카테고리 이름을 입력해 주세요.' }, { status: 400 })
  }

  // 현재 최대 sort_order 가져오기
  const { data: last } = await service
    .from('inventory_categories')
    .select('sort_order')
    .eq('business_id', businessId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await service
    .from('inventory_categories')
    .insert({ business_id: businessId, name: name.trim(), sort_order: (last?.sort_order ?? -1) + 1 })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ success: false, error: '이미 존재하는 카테고리 이름입니다.' }, { status: 409 })
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, data })
}
