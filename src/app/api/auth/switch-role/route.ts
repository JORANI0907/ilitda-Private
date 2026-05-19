import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ActiveRole } from '@/types'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const { role } = body as { role?: unknown }

  if (role !== 'business' && role !== 'worker') {
    return NextResponse.json(
      { success: false, error: 'role은 business 또는 worker 여야 합니다.' },
      { status: 400 },
    )
  }

  const targetRole = role as ActiveRole
  const service = createServiceClient()

  // 현재 프로필 조회 — 해당 역할 자격이 있는지 확인
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('id, active_role, is_business, is_worker')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { success: false, error: '프로필 정보를 찾을 수 없습니다.' },
      { status: 404 },
    )
  }

  // 역할 자격 검사
  if (targetRole === 'business' && !profile.is_business) {
    return NextResponse.json(
      { success: false, error: '사업자 등록이 필요합니다.' },
      { status: 403 },
    )
  }

  if (targetRole === 'worker' && !profile.is_worker) {
    return NextResponse.json(
      { success: false, error: '용역자 등록이 필요합니다.' },
      { status: 403 },
    )
  }

  const { error } = await service
    .from('profiles')
    .update({ active_role: targetRole })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { active_role: targetRole } })
}
