import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_NOTIFICATION_CONFIG } from '@/lib/settings-defaults'
import type { ApiResponse, NotificationConfig } from '@/types'

interface NotificationConfigWithPlan extends NotificationConfig {
  plan_type: string
}

export async function GET(): Promise<NextResponse<ApiResponse<NotificationConfigWithPlan>>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: biz } = await service
    .schema('ilitda')
    .from('businesses')
    .select('notification_config, plan_type')
    .eq('profile_id', user.id)
    .maybeSingle()

  const saved = biz?.notification_config as NotificationConfig | null
  const defaultRules = DEFAULT_NOTIFICATION_CONFIG.rules
  const savedMap = new Map((saved?.rules ?? []).map((r) => [r.type, r]))
  const rules = defaultRules.map((def) => ({ ...def, ...(savedMap.get(def.type) ?? {}) }))
  const plan_type = (biz?.plan_type as string | null) ?? 'free'

  return NextResponse.json({ success: true, data: { rules, plan_type } })
}

export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })
  }

  let body: NotificationConfig
  try {
    body = await req.json() as NotificationConfig
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 형식입니다' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .schema('ilitda')
    .from('businesses')
    .update({ notification_config: body })
    .eq('profile_id', user.id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
