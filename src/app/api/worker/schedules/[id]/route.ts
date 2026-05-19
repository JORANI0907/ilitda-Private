import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const service = createServiceClient()

  const { data: worker, error: workerError } = await service
    .from('workers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (workerError || !worker) {
    return NextResponse.json(
      { success: false, error: '용역자 정보를 찾을 수 없습니다.' },
      { status: 404 },
    )
  }

  const { data, error } = await service
    .from('assignments')
    .select(
      `
      id,
      status,
      hourly_rate,
      schedule:schedules(
        id,
        service_date,
        start_time,
        end_time,
        notes,
        status,
        client:clients(id, name, address, phone)
      ),
      attendance(
        id,
        checkin_at,
        checkin_lat,
        checkin_lng,
        checkout_at,
        checkout_lat,
        checkout_lng,
        total_minutes
      )
    `,
    )
    .eq('id', id)
    .eq('worker_id', worker.id)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: '일정을 찾을 수 없습니다.' },
      { status: 404 },
    )
  }

  return NextResponse.json({ success: true, data })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const service = createServiceClient()

  const { data: worker, error: workerError } = await service
    .from('workers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (workerError || !worker) {
    return NextResponse.json(
      { success: false, error: '용역자 정보를 찾을 수 없습니다.' },
      { status: 404 },
    )
  }

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const ALLOWED = ['status'] as const
  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in (body as Record<string, unknown>)) {
      updates[key] = (body as Record<string, unknown>)[key]
    }
  }

  if (!updates.status || !['accepted', 'rejected'].includes(updates.status as string)) {
    return NextResponse.json(
      { success: false, error: 'status는 accepted 또는 rejected 여야 합니다.' },
      { status: 400 },
    )
  }

  const { error } = await service
    .from('assignments')
    .update(updates)
    .eq('id', id)
    .eq('worker_id', worker.id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
