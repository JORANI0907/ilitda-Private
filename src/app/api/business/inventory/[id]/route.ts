import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function getBusinessId(userId: string) {
  const service = createServiceClient()
  const { data } = await service
    .from('businesses')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })

  const businessId = await getBusinessId(user.id)
  if (!businessId) return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const { name, unit, min_qty, category } = body as Record<string, unknown>

  const updates: Record<string, unknown> = {}
  if (name && typeof name === 'string' && name.trim()) updates.name = name.trim()
  if (unit !== undefined) updates.unit = typeof unit === 'string' && unit.trim() ? unit.trim() : null
  if (min_qty !== undefined) updates.min_qty = min_qty !== '' && !isNaN(Number(min_qty)) ? Number(min_qty) : null
  if (category && typeof category === 'string' && category.trim()) updates.category = category.trim()

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: '변경할 내용이 없습니다.' }, { status: 400 })
  }
  updates.updated_at = new Date().toISOString()

  const service = createServiceClient()
  const { data, error } = await service
    .from('inventory')
    .update(updates)
    .eq('id', id)
    .eq('business_id', businessId)
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })

  const businessId = await getBusinessId(user.id)
  if (!businessId) return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })

  const service = createServiceClient()
  const { error } = await service
    .from('inventory')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId)

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
