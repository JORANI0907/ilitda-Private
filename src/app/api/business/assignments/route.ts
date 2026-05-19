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

  const b = body as Record<string, unknown>
  const updates: Record<string, unknown> = { status: 'pending' }

  for (const key of ['schedule_id', 'worker_id', 'connection_id', 'hourly_rate'] as const) {
    if (key in b) updates[key] = b[key]
  }

  if (!updates.schedule_id) {
    return NextResponse.json({ success: false, error: 'schedule_id는 필수입니다.' }, { status: 400 })
  }
  if (!updates.worker_id && !updates.connection_id) {
    return NextResponse.json(
      { success: false, error: 'worker_id 또는 connection_id가 필요합니다.' },
      { status: 400 },
    )
  }

  const service = createServiceClient()

  const { data, error } = await service
    .from('assignments')
    .insert(updates)
    .select(`
      *,
      connection:connections(id, display_name, manual_phone),
      worker:workers(id, profile:profiles(name, phone))
    `)
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}
