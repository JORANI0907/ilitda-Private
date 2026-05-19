import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 50 } })
  }

  const service = createServiceClient()

  const { data: business, error: bizError } = await service
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (bizError || !business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 배정 이력 기준으로 해당 사업자와 관련된 작업자 목록 조회
  const { data: assignmentData, error: assignmentError } = await service
    .from('assignments')
    .select(`
      worker_id,
      created_at,
      schedule:schedules!inner(business_id),
      worker:workers(
        id,
        profile:profiles(name, phone, rating_avg, rating_count)
      )
    `)
    .eq('schedule.business_id', business.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (assignmentError) {
    return NextResponse.json({ success: false, error: assignmentError.message }, { status: 500 })
  }

  // worker_id 중복 제거, 가장 최근 배정 기준
  const seen = new Set<string>()
  const workers: Array<{
    worker_id: string
    last_worked: string
    worker: unknown
  }> = []

  for (const row of (assignmentData ?? [])) {
    if (!seen.has(row.worker_id)) {
      seen.add(row.worker_id)
      workers.push({
        worker_id: row.worker_id,
        last_worked: row.created_at,
        worker: row.worker,
      })
    }
  }

  return NextResponse.json({
    success: true,
    data: workers,
    meta: { total: workers.length, page: 1, limit: 50 },
  })
}
