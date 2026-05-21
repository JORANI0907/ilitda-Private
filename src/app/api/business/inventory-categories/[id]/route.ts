import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

// 카테고리 이름 변경 — 연결된 inventory 행도 함께 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
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
  const newName = name.trim()

  // 기존 이름 확인
  const { data: existing } = await service
    .from('inventory_categories')
    .select('name')
    .eq('id', id)
    .eq('business_id', businessId)
    .maybeSingle()

  if (!existing) return NextResponse.json({ success: false, error: '카테고리를 찾을 수 없습니다.' }, { status: 404 })

  const oldName = existing.name

  // 카테고리 이름 변경
  const { data, error } = await service
    .from('inventory_categories')
    .update({ name: newName })
    .eq('id', id)
    .eq('business_id', businessId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ success: false, error: '이미 존재하는 카테고리 이름입니다.' }, { status: 409 })
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // inventory 행 일괄 업데이트 (이름 기반 참조)
  await service
    .from('inventory')
    .update({ category: newName })
    .eq('business_id', businessId)
    .eq('category', oldName)

  return NextResponse.json({ success: true, data })
}

// 카테고리 삭제 — 해당 항목은 fallbackName(기타 등) 으로 이동
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  const { service, businessId } = ctx

  const url = new URL(request.url)
  const fallbackName = url.searchParams.get('fallback') ?? '기타'

  const { data: existing } = await service
    .from('inventory_categories')
    .select('name')
    .eq('id', id)
    .eq('business_id', businessId)
    .maybeSingle()

  if (!existing) return NextResponse.json({ success: false, error: '카테고리를 찾을 수 없습니다.' }, { status: 404 })

  // 남은 카테고리 수 확인 (최소 1개 유지)
  const { count } = await service
    .from('inventory_categories')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)

  if ((count ?? 0) <= 1) {
    return NextResponse.json({ success: false, error: '카테고리가 최소 1개 이상 있어야 합니다.' }, { status: 400 })
  }

  // inventory 항목들을 fallback 카테고리로 이동
  await service
    .from('inventory')
    .update({ category: fallbackName })
    .eq('business_id', businessId)
    .eq('category', existing.name)

  const { error } = await service
    .from('inventory_categories')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId)

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
