import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface VoidBody {
  reason: string
}

// ─── POST: 계약서 파기 ───────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: biz } = await service.schema('ilitda').from('businesses')
    .select('id').eq('profile_id', user.id).maybeSingle()
  if (!biz) {
    return NextResponse.json({ error: '사업자 정보 없음' }, { status: 403 })
  }

  let body: VoidBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  }

  if (!body.reason?.trim()) {
    return NextResponse.json({ error: '파기 사유를 입력해 주세요' }, { status: 400 })
  }

  // 소유권 및 상태 확인
  const { data: contract } = await service.schema('ilitda')
    .from('contracts')
    .select('id, signing_status')
    .eq('id', id)
    .eq('business_id', biz.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!contract) {
    return NextResponse.json({ error: '계약서를 찾을 수 없습니다' }, { status: 404 })
  }
  if (contract.signing_status === 'voided') {
    return NextResponse.json({ error: '이미 파기된 계약서입니다' }, { status: 400 })
  }

  const { error } = await service.schema('ilitda')
    .from('contracts')
    .update({
      signing_status: 'voided',
      voided_at:      new Date().toISOString(),
      void_reason:    body.reason.trim(),
      updated_at:     new Date().toISOString(),
    })
    .eq('id', id)
    .eq('business_id', biz.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
