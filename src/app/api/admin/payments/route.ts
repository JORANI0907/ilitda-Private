import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

interface Payment {
  id: string
  business_id: string
  plan_name: string
  current_plan: string | null
  request_type: string | null
  amount: number
  depositor_name: string
  status: string
  confirmed_at: string | null
  created_at: string
  business_name: string | null
  business_plan_expires_at: string | null
}

interface PatchBody {
  paymentId: string
  action: 'confirm' | 'fail'
}

async function checkAdmin(userId: string): Promise<boolean> {
  const service = createServiceClient()
  const { data } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle()
  return data?.is_admin === true
}

async function sendSlack(text: string): Promise<void> {
  try {
    await fetch(process.env.SLACK_WEBHOOK_URL ?? '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch {
    // Slack 발송 실패는 무시
  }
}

export async function GET(): Promise<NextResponse<ApiResponse<Payment[]>>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const isAdmin = await checkAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const service = createServiceClient()

  const { data: payments, error } = await service
    .from('payments')
    .select('*, businesses(business_name, plan_expires_at)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const result: Payment[] = (payments ?? []).map(p => {
    const biz = p.businesses as { business_name: string; plan_expires_at: string | null } | null
    return {
      id: p.id,
      business_id: p.business_id,
      plan_name: p.plan_name,
      current_plan: p.current_plan ?? null,
      request_type: p.request_type ?? null,
      amount: p.amount,
      depositor_name: p.depositor_name,
      status: p.status,
      confirmed_at: p.confirmed_at,
      created_at: p.created_at,
      business_name: biz?.business_name ?? null,
      business_plan_expires_at: biz?.plan_expires_at ?? null,
    }
  })

  return NextResponse.json({ success: true, data: result })
}

export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const isAdmin = await checkAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  let body: PatchBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const { paymentId, action } = body

  if (!paymentId || !action) {
    return NextResponse.json({ success: false, error: 'paymentId와 action은 필수입니다.' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: payment, error: fetchError } = await service
    .from('payments')
    .select('*, businesses(business_name, plan_expires_at)')
    .eq('id', paymentId)
    .maybeSingle()

  if (fetchError || !payment) {
    return NextResponse.json({ success: false, error: '결제 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const bizData = payment.businesses as { business_name: string; plan_expires_at: string | null } | null
  const bizName = bizData?.business_name ?? '알 수 없음'

  if (action === 'confirm') {
    const now = new Date()
    let expiresAt: Date

    const requestType = payment.request_type ?? 'upgrade'

    if (requestType === 'renewal' && bizData?.plan_expires_at) {
      // 갱신: 현재 만료일 기준으로 30일 연장 (아직 유효한 경우)
      const currentExpires = new Date(bizData.plan_expires_at)
      const base = currentExpires > now ? currentExpires : now
      expiresAt = new Date(base)
      expiresAt.setDate(expiresAt.getDate() + 30)
    } else {
      // 업그레이드 / 하향: 오늘부터 30일
      expiresAt = new Date(now)
      expiresAt.setDate(expiresAt.getDate() + 30)
    }

    const expiresDateStr = expiresAt.toISOString().slice(0, 10)

    const { error: payError } = await service
      .from('payments')
      .update({ status: 'confirmed', confirmed_at: now.toISOString() })
      .eq('id', paymentId)

    if (payError) {
      return NextResponse.json({ success: false, error: payError.message }, { status: 500 })
    }

    const { error: bizError } = await service
      .from('businesses')
      .update({ plan: payment.plan_name, plan_expires_at: expiresDateStr })
      .eq('id', payment.business_id)

    if (bizError) {
      return NextResponse.json({ success: false, error: bizError.message }, { status: 500 })
    }

    const typeLabel = requestType === 'renewal' ? '갱신' : requestType === 'downgrade' ? '하향' : '업그레이드'
    await sendSlack(
      `✅ *플랜 확인 완료* | ${bizName} - ${payment.plan_name} 플랜 ${typeLabel} (만료일: ${expiresDateStr})`
    )

  } else if (action === 'fail') {
    const { error: payError } = await service
      .from('payments')
      .update({ status: 'failed' })
      .eq('id', paymentId)

    if (payError) {
      return NextResponse.json({ success: false, error: payError.message }, { status: 500 })
    }

    await sendSlack(`❌ *플랜 신청 거절* | ${bizName} - ${payment.plan_name} 플랜 거절`)

  } else {
    return NextResponse.json({ success: false, error: '유효하지 않은 action입니다.' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
