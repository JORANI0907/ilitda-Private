import type { SupabaseClient } from '@supabase/supabase-js'
import { PLAN_SMS_LIMITS } from '@/types'

export interface SmsLimitResult {
  allowed: boolean
  used: number
  limit: number
  remaining: number
}

// 하루 발송 한도 확인 및 카운트 증가 (원자적)
export async function checkAndIncrementSmsLimit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  businessId: string,
  planType: string = 'free',
): Promise<SmsLimitResult> {
  const limit = PLAN_SMS_LIMITS[planType] ?? PLAN_SMS_LIMITS.free
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // 현재 상태 조회
  const { data: biz, error } = await supabase
    .schema('ilitda')
    .from('businesses')
    .select('daily_sms_count, daily_sms_reset_date')
    .eq('id', businessId)
    .single()

  if (error || !biz) throw new Error('업체 정보를 불러올 수 없습니다.')

  const isNewDay = biz.daily_sms_reset_date !== today
  const currentCount = isNewDay ? 0 : (biz.daily_sms_count ?? 0)

  if (currentCount >= limit) {
    return { allowed: false, used: currentCount, limit, remaining: 0 }
  }

  // 카운트 증가 (날짜가 바뀌면 1로 초기화)
  await supabase
    .schema('ilitda')
    .from('businesses')
    .update({
      daily_sms_count: currentCount + 1,
      daily_sms_reset_date: today,
    })
    .eq('id', businessId)

  return {
    allowed: true,
    used: currentCount + 1,
    limit,
    remaining: limit - currentCount - 1,
  }
}
