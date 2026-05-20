import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_MSG_TEMPLATE } from '@/lib/settings-defaults'
import { sendSMS } from '@/lib/solapi/client'
import type { ApiResponse, NotificationConfig, NotificationRule, ServiceApplication } from '@/types'

const CRON_SECRET = 'BBK_CRON_2024_xK9mPqR3vLwZnYeA'

interface AutoDispatchBusiness {
  id: string
  profile_id: string
  notification_config: NotificationConfig | null
}

interface DispatchResult {
  business_id: string
  application_id: string
  type: string
  status: 'sent' | 'failed'
  error?: string
}

function getTodayKST(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function buildMessage(rule: NotificationRule, app: ServiceApplication): string {
  if (rule.template) return rule.template

  const templateFn = DEFAULT_MSG_TEMPLATE[rule.type]
  if (!templateFn) return `[일잇다] ${app.business_name} 담당자님, ${rule.type} 알림입니다.`

  return templateFn({
    name: app.owner_name ?? app.business_name,
    date: app.construction_date ?? '',
    time: app.construction_time ?? '',
    amount: String(app.supply_amount ?? ''),
    account: app.account_number ?? '',
  })
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<DispatchResult[]>>> {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: '인증 실패' }, { status: 401 })
  }

  const today = getTodayKST()
  const service = createServiceClient()
  const results: DispatchResult[] = []

  const { data: businesses, error: bizError } = await service
    .schema('ilitda')
    .from('businesses')
    .select('id, profile_id, notification_config')

  if (bizError) {
    return NextResponse.json({ success: false, error: bizError.message }, { status: 500 })
  }

  const bizList = (businesses ?? []) as AutoDispatchBusiness[]

  for (const biz of bizList) {
    const config = biz.notification_config
    if (!config?.rules) continue

    const autoRules = config.rules.filter(
      (r) => r.enabled && r.mode === 'auto' && r.trigger
    )
    if (autoRules.length === 0) continue

    for (const rule of autoRules) {
      if (!rule.trigger) continue
      const targetDate = addDays(today, -rule.trigger.offset_days)

      const { data: apps, error: appError } = await service
        .schema('ilitda')
        .from('service_applications')
        .select('*')
        .eq('business_id', biz.id)
        .eq('construction_date', targetDate)

      if (appError || !apps) continue

      for (const app of apps as ServiceApplication[]) {
        if (!app.phone) continue

        const message = buildMessage(rule, app)

        try {
          await sendSMS(app.phone, message)

          const existing = (app.notification_log ?? []) as Array<{ type: string; sent_at: string; method?: string }>
          const updatedLog = [
            ...existing,
            { type: rule.type, sent_at: new Date().toISOString(), method: 'auto' as const },
          ]

          await service
            .schema('ilitda')
            .from('service_applications')
            .update({ notification_log: updatedLog })
            .eq('id', app.id)

          results.push({ business_id: biz.id, application_id: app.id, type: rule.type, status: 'sent' })
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : '발송 실패'
          results.push({ business_id: biz.id, application_id: app.id, type: rule.type, status: 'failed', error: errMsg })
        }
      }
    }
  }

  return NextResponse.json({ success: true, data: results })
}
