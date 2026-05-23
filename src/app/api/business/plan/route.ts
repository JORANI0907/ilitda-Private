import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

interface PlanInfo {
  plan: string
  plan_expires_at: string | null
}

interface PlanRequestBody {
  plan_name: string
  depositor_name: string
}

const PLAN_AMOUNTS: Record<string, number> = {
  basic: 9900,
  pro: 14900,
  max: 25000,
}

const PLAN_ORDER: Record<string, number> = {
  free: 0, basic: 1, pro: 2, max: 3,
}

type RequestType = 'upgrade' | 'renewal' | 'downgrade'

function getRequestType(currentPlan: string, newPlan: string): RequestType {
  const curr = PLAN_ORDER[currentPlan] ?? 0
  const next = PLAN_ORDER[newPlan] ?? 1
  if (next > curr) return 'upgrade'
  if (next === curr) return 'renewal'
  return 'downgrade'
}

const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  upgrade: '⬆️ 업그레이드',
  renewal: '🔄 갱신',
  downgrade: '⬇️ 하향',
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

export async function GET(): Promise<NextResponse<ApiResponse<PlanInfo>>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const service = createServiceClient()

  const { data: business, error } = await service
    .from('businesses')
    .select('plan, plan_expires_at')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  if (!business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      plan: business.plan ?? 'free',
      plan_expires_at: business.plan_expires_at ?? null,
    },
  })
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  let body: PlanRequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const { plan_name, depositor_name } = body

  if (!plan_name || !depositor_name?.trim()) {
    return NextResponse.json({ success: false, error: '플랜명과 입금자명은 필수입니다.' }, { status: 400 })
  }

  const amount = PLAN_AMOUNTS[plan_name]
  if (!amount) {
    return NextResponse.json({ success: false, error: '유효하지 않은 플랜입니다.' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: business, error: bizError } = await service
    .from('businesses')
    .select('id, business_name, plan')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (bizError || !business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const currentPlan = business.plan ?? 'free'
  const requestType = getRequestType(currentPlan, plan_name)

  const { error: insertError } = await service
    .from('payments')
    .insert({
      business_id: business.id,
      plan_name,
      amount,
      depositor_name: depositor_name.trim(),
      status: 'pending',
      current_plan: currentPlan,
      request_type: requestType,
    })

  if (insertError) {
    return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
  }

  await sendSlack(
    `💳 *플랜 신청* | ${business.business_name} - ${REQUEST_TYPE_LABEL[requestType]} ${currentPlan} → ${plan_name} - 입금자: ${depositor_name.trim()}`
  )

  return NextResponse.json({ success: true }, { status: 201 })
}
