import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

  const { inventory_id, type, qty: rawQty, note } = body as Record<string, unknown>

  if (!inventory_id || typeof inventory_id !== 'string') {
    return NextResponse.json({ success: false, error: '항목을 선택해 주세요.' }, { status: 400 })
  }
  if (type !== 'in' && type !== 'out' && type !== 'adjust') {
    return NextResponse.json({ success: false, error: '유형이 올바르지 않습니다.' }, { status: 400 })
  }
  const qty = Number(rawQty)
  if (rawQty === undefined || rawQty === '' || isNaN(qty) || qty < 0) {
    return NextResponse.json({ success: false, error: '수량을 올바르게 입력해 주세요.' }, { status: 400 })
  }

  const service = createServiceClient()

  // 해당 항목이 이 사용자의 사업자 소유인지 검증
  const { data: business } = await service
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { data: item } = await service
    .from('inventory')
    .select('id, current_qty')
    .eq('id', inventory_id)
    .eq('business_id', business.id)
    .maybeSingle()

  if (!item) {
    return NextResponse.json({ success: false, error: '재고 항목을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 트랜잭션 기록 + 수량 업데이트
  // adjust는 qty를 절대값으로 설정, in/out은 delta 처리
  const newQty = type === 'in'
    ? item.current_qty + qty
    : type === 'out'
    ? Math.max(0, item.current_qty - qty)
    : qty

  const [txResult, updateResult] = await Promise.all([
    service.from('inventory_transactions').insert({
      inventory_id,
      type,
      qty,
      note: note && typeof note === 'string' ? note.trim() || null : null,
    }),
    service.from('inventory').update({ current_qty: newQty }).eq('id', inventory_id),
  ])

  if (txResult.error) {
    return NextResponse.json({ success: false, error: txResult.error.message }, { status: 500 })
  }
  if (updateResult.error) {
    return NextResponse.json({ success: false, error: updateResult.error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
