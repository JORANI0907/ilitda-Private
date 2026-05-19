import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const ALLOWED = ['schedule_id', 'worker_id', 'hourly_rate'] as const
  const updates: Record<string, unknown> = { status: 'pending' }
  for (const key of ALLOWED) {
    if (key in (body as Record<string, unknown>)) {
      updates[key] = (body as Record<string, unknown>)[key]
    }
  }

  if (!updates.schedule_id || !updates.worker_id) {
    return NextResponse.json({ success: false, error: 'schedule_id, worker_id는 필수입니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('assignments')
    .insert(updates)
    .select(`
      *,
      worker:workers(
        id,
        profile:profiles(name, phone)
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}
