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

  const { assignmentId, type, lat, lng } = body as {
    assignmentId?: unknown
    type?: unknown
    lat?: unknown
    lng?: unknown
  }

  if (typeof assignmentId !== 'string' || !assignmentId) {
    return NextResponse.json({ success: false, error: 'assignmentId가 필요합니다.' }, { status: 400 })
  }

  if (type !== 'checkin' && type !== 'checkout') {
    return NextResponse.json(
      { success: false, error: 'type은 checkin 또는 checkout 이어야 합니다.' },
      { status: 400 },
    )
  }

  // 용역자 확인
  const { data: worker, error: workerError } = await supabase
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

  // 배정 확인 (내 배정인지 검증)
  const { data: assignment, error: assignError } = await supabase
    .from('assignments')
    .select('id, status')
    .eq('id', assignmentId)
    .eq('worker_id', worker.id)
    .single()

  if (assignError || !assignment) {
    return NextResponse.json({ success: false, error: '배정 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const latNum = typeof lat === 'number' ? lat : null
  const lngNum = typeof lng === 'number' ? lng : null

  // 기존 출퇴근 레코드 조회
  const { data: existing } = await supabase
    .from('attendances')
    .select('id, checkin_at')
    .eq('assignment_id', assignmentId)
    .single()

  if (type === 'checkin') {
    if (existing) {
      // 이미 체크인 기록이 있으면 업데이트
      const { error } = await supabase
        .from('attendances')
        .update({ checkin_at: now, checkin_lat: latNum, checkin_lng: lngNum })
        .eq('id', existing.id)

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
    } else {
      // 새 출퇴근 레코드 생성
      const { error } = await supabase.from('attendances').insert({
        assignment_id: assignmentId,
        worker_id: worker.id,
        checkin_at: now,
        checkin_lat: latNum,
        checkin_lng: lngNum,
      })

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
    }

    // 배정 상태 → in_progress 업데이트 (현재 accepted 상태인 경우만)
    if (assignment.status === 'accepted') {
      await supabase
        .from('assignments')
        .update({ status: 'accepted' })
        .eq('id', assignmentId)
    }
  } else {
    // checkout
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '체크인 기록이 없습니다. 먼저 출근 체크인을 해주세요.' },
        { status: 400 },
      )
    }

    // total_minutes 계산
    let totalMinutes: number | null = null
    if (existing.checkin_at) {
      const checkinMs = new Date(existing.checkin_at).getTime()
      const checkoutMs = new Date(now).getTime()
      totalMinutes = Math.round((checkoutMs - checkinMs) / 60000)
    }

    const { error } = await supabase
      .from('attendances')
      .update({
        checkout_at: now,
        checkout_lat: latNum,
        checkout_lng: lngNum,
        total_minutes: totalMinutes,
      })
      .eq('id', existing.id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, data: { type, timestamp: now } })
}
