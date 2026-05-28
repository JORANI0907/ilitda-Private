import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkAndIncrementSmsLimit } from '@/lib/sms-limit'
import { sendSMS } from '@/lib/solapi/client'
import { applyNotificationTemplate, DEFAULT_MSG_TEMPLATE, CUSTOM_NOTIFICATION_DEFAULT_TEMPLATE } from '@/lib/settings-defaults'
import type { ApiResponse, NotifyLog, NotificationConfig } from '@/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json<ApiResponse>({ success: false, error: '인증 필요' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: biz } = await service
    .schema('ilitda')
    .from('businesses')
    .select('id, solapi_from_phone, solapi_phone_verified, plan_type, notification_config')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!biz) {
    return NextResponse.json<ApiResponse>({ success: false, error: '업체 정보를 찾을 수 없습니다.' }, { status: 403 })
  }

  try {
    const { notifyType } = await req.json() as { notifyType: string }

    const { data: app, error: fetchErr } = await service
      .schema('ilitda')
      .from('service_applications')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !app) throw new Error('신청서를 찾을 수 없습니다.')
    if (!app.phone) throw new Error('연락처가 없습니다.')
    if (notifyType === '폴더링크알림' && !app.drive_folder_url) throw new Error('작업 폴더가 아직 생성되지 않았습니다.')

    // SMS 발송 한도 확인 및 증가
    const limitResult = await checkAndIncrementSmsLimit(service, biz.id, biz.plan_type ?? 'free')
    if (!limitResult.allowed) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `이번 달 발송 한도(${limitResult.limit}건)에 도달했습니다.` },
        { status: 429 }
      )
    }

    const contactPhone = biz.solapi_phone_verified && biz.solapi_from_phone
      ? biz.solapi_from_phone
      : (process.env.SOLAPI_FROM_PHONE ?? '')

    // 커스텀 템플릿 우선, 없으면 DEFAULT_MSG_TEMPLATE, 그 외엔 CUSTOM_NOTIFICATION_DEFAULT_TEMPLATE
    const notifConfig = biz.notification_config as NotificationConfig | null
    const matchedRule = notifConfig?.rules?.find(r => r.type === notifyType)
    let msgText: string

    if (matchedRule?.template) {
      msgText = applyNotificationTemplate(matchedRule.template, app as Record<string, unknown>)
    } else {
      const templateFn = DEFAULT_MSG_TEMPLATE[notifyType]
      if (templateFn) {
        msgText = templateFn({
          name:      app.owner_name ?? '고객',
          date:      app.construction_date ?? '',
          time:      app.construction_time ?? '',
          amount:    app.balance?.toLocaleString('ko-KR') ?? '',
          account:   app.account_number ?? '',
          contact:   contactPhone,
          folderUrl: app.drive_folder_url ?? '',
        })
      } else {
        // 커스텀 알림이지만 template 미설정 시 범용 기본 문구 사용
        msgText = applyNotificationTemplate(CUSTOM_NOTIFICATION_DEFAULT_TEMPLATE, app as Record<string, unknown>)
      }
    }

    await sendSMS(app.phone, msgText)

    // 알림 기록 append
    const newLog: NotifyLog = { type: notifyType, sent_at: new Date().toISOString(), method: 'manual' }
    const { data: current } = await service
      .schema('ilitda')
      .from('service_applications')
      .select('notification_log')
      .eq('id', id)
      .single()

    const prevLog: NotifyLog[] = (current?.notification_log as NotifyLog[]) ?? []

    // 알림 규칙에 status_value가 있으면 상태 자동 변경
    const newStatus = matchedRule?.status_value
    const updatePayload: Record<string, unknown> = { notification_log: [...prevLog, newLog] }
    if (newStatus) updatePayload.status = newStatus

    await service
      .schema('ilitda')
      .from('service_applications')
      .update(updatePayload)
      .eq('id', id)

    return NextResponse.json<ApiResponse>({ success: true, data: newStatus ? { newStatus } : undefined })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '발송 실패'
    return NextResponse.json<ApiResponse>({ success: false, error: msg }, { status: 500 })
  }
}
