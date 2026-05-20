import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkAndIncrementSmsLimit } from '@/lib/sms-limit'
import { sendSMS } from '@/lib/solapi/client'
import type { ApiResponse, NotifyLog } from '@/types'

const MSG_TEMPLATE: Record<string, (p: Record<string, string>) => string> = {
  '예약확정알림':         (p) => `[일잇다] ${p.name} 담당자님, 예약이 확정되었습니다.\n시공일: ${p.date} ${p.time}\n문의: ${p.contact}`,
  '예약1일전알림':        (p) => `[일잇다] ${p.name} 담당자님, 내일(${p.date}) 방문 예정입니다.\n시간: ${p.time}\n문의: ${p.contact}`,
  '예약당일알림':         (p) => `[일잇다] ${p.name} 담당자님, 오늘(${p.date}) 방문 예정입니다.\n문의: ${p.contact}`,
  '작업완료알림':         (p) => `[일잇다] ${p.name} 담당자님, 작업이 완료되었습니다.\n이용해 주셔서 감사합니다.\n문의: ${p.contact}`,
  '결제알림':             (p) => `[일잇다] ${p.name} 담당자님, 결제 안내 드립니다.\n금액: ${p.amount}원\n계좌: ${p.account}\n문의: ${p.contact}`,
  '결제완료알림':         (p) => `[일잇다] ${p.name} 담당자님, 결제가 확인되었습니다. 감사합니다.\n문의: ${p.contact}`,
  '결제완료알림(잔금)':   (p) => `[일잇다] ${p.name} 담당자님, 잔금 결제가 확인되었습니다. 감사합니다.\n문의: ${p.contact}`,
  '계산서발행완료알림':   (p) => `[일잇다] ${p.name} 담당자님, 세금계산서가 발행되었습니다.\n문의: ${p.contact}`,
  '예약금 입금완료 알림': (p) => `[일잇다] ${p.name} 담당자님, 예약금 입금이 확인되었습니다.\n문의: ${p.contact}`,
  '예약금환급완료알림':   (p) => `[일잇다] ${p.name} 담당자님, 예약금이 환급되었습니다.\n문의: ${p.contact}`,
  '예약취소알림':         (p) => `[일잇다] ${p.name} 담당자님, 예약이 취소되었습니다.\n문의: ${p.contact}`,
  'A/S방문알림':          (p) => `[일잇다] ${p.name} 담당자님, A/S 방문 일정을 안내 드립니다.\n방문일: ${p.date}\n문의: ${p.contact}`,
  '방문견적알림':         (p) => `[일잇다] ${p.name} 담당자님, 방문견적 일정을 안내 드립니다.\n방문일: ${p.date}\n문의: ${p.contact}`,
}

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
    .select('id, solapi_from_phone, solapi_phone_verified, plan_type')
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
      .select('owner_name,phone,construction_date,construction_time,balance,account_number')
      .eq('id', id)
      .single()

    if (fetchErr || !app) throw new Error('신청서를 찾을 수 없습니다.')
    if (!app.phone) throw new Error('연락처가 없습니다.')

    const templateFn = MSG_TEMPLATE[notifyType]
    if (!templateFn) throw new Error('지원하지 않는 알림 유형입니다.')

    // SMS 발송 한도 확인 및 증가
    const limitResult = await checkAndIncrementSmsLimit(service, biz.id, biz.plan_type ?? 'free')
    if (!limitResult.allowed) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `오늘 발송 한도(${limitResult.limit}건)에 도달했습니다.` },
        { status: 429 }
      )
    }

    const contactPhone = biz.solapi_phone_verified && biz.solapi_from_phone
      ? biz.solapi_from_phone
      : (process.env.SOLAPI_FROM_PHONE ?? '')

    const msgText = templateFn({
      name:    app.owner_name ?? '고객',
      date:    app.construction_date ?? '',
      time:    app.construction_time ?? '',
      amount:  app.balance?.toLocaleString('ko-KR') ?? '',
      account: app.account_number ?? '',
      contact: contactPhone,
    })

    const fromPhone = biz.solapi_phone_verified && biz.solapi_from_phone ? biz.solapi_from_phone : undefined
    await sendSMS(app.phone, msgText, fromPhone)

    // 알림 기록 append
    const newLog: NotifyLog = { type: notifyType, sent_at: new Date().toISOString(), method: 'manual' }
    const { data: current } = await service
      .schema('ilitda')
      .from('service_applications')
      .select('notification_log')
      .eq('id', id)
      .single()

    const prevLog: NotifyLog[] = (current?.notification_log as NotifyLog[]) ?? []
    await service
      .schema('ilitda')
      .from('service_applications')
      .update({ notification_log: [...prevLog, newLog] })
      .eq('id', id)

    return NextResponse.json<ApiResponse>({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '발송 실패'
    return NextResponse.json<ApiResponse>({ success: false, error: msg }, { status: 500 })
  }
}
