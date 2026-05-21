import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

interface Payment {
  id: string
  business_id: string
  plan_name: string
  amount: number
  depositor_name: string
  status: string
  confirmed_at: string | null
  created_at: string
  business_name: string | null
}

interface PatchBody {
  paymentId: string
  action: 'confirm' | 'fail'
  planName?: string
  durationDays?: number
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
    .select('*, businesses(business_name)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const result: Payment[] = (payments ?? []).map(p => ({
    id: p.id,
    business_id: p.business_id,
    plan_name: p.plan_name,
    amount: p.amount,
    depositor_name: p.depositor_name,
    status: p.status,
    confirmed_at: p.confirmed_at,
    created_at: p.created_at,
    business_name: (p.businesses as { business_name: string } | null)?.business_name ?? null,
  }))

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

  const { paymentId, action, planName, durationDays = 30 } = body

  if (!paymentId || !action) {
    return NextResponse.json({ success: false, error: 'paymentId와 action은 필수입니다.' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: payment, error: fetchError } = await service
    .from('payments')
    .select('*, businesses(business_name)')
    .eq('id', paymentId)
    .maybeSingle()

  if (fetchError || !payment) {
    return NextResponse.json({ success: false, error: '결제 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (action === 'confirm') {
    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + durationDays)
    const expiresDateStr = expiresAt.toISOString().slice(0, 10)

    const { error: payError } = await service
      .from('payments')
      .update({ status: 'confirmed', confirmed_at: now.toISOString() })
      .eq('id', paymentId)

    if (payError) {
      return NextResponse.json({ success: false, error: payError.message }, { status: 500 })
    }

    const finalPlanName = planName ?? payment.plan_name

    const { error: bizError } = await service
      .from('businesses')
      .update({ plan: finalPlanName, plan_expires_at: expiresDateStr })
      .eq('id', payment.business_id)

    if (bizError) {
      return NextResponse.json({ success: false, error: bizError.message }, { status: 500 })
    }

    const bizName = (payment.businesses as { business_name: string } | null)?.business_name ?? '알 수 없음'
    await sendSlack(`✅ *플랜 확인 완료* | ${bizName} - ${finalPlanName} 플랜 활성화 (${durationDays}일)`)

  } else if (action === 'fail') {
    const { error: payError } = await service
      .from('payments')
      .update({ status: 'failed' })
      .eq('id', paymentId)

    if (payError) {
      return NextResponse.json({ success: false, error: payError.message }, { status: 500 })
    }

    const bizName = (payment.businesses as { business_name: string } | null)?.business_name ?? '알 수 없음'
    await sendSlack(`❌ *플랜 신청 거절* | ${bizName} - ${payment.plan_name} 플랜 거절`)

  } else {
    return NextResponse.json({ success: false, error: '유효하지 않은 action입니다.' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
