import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 50 } })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (bizError || !business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  let query = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('business_id', business.id)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (q.trim()) {
    query = query.ilike('name', `%${q.trim()}%`)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: data ?? [],
    meta: { total: count ?? 0, page: 1, limit: 50 },
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (bizError || !business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const ALLOWED = ['name', 'phone', 'address', 'type', 'notes'] as const
  const updates: Record<string, unknown> = { business_id: business.id }
  for (const key of ALLOWED) {
    if (key in (body as Record<string, unknown>)) {
      updates[key] = (body as Record<string, unknown>)[key]
    }
  }

  if (!updates.name) {
    return NextResponse.json({ success: false, error: '고객명은 필수입니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('clients')
    .insert(updates)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}
