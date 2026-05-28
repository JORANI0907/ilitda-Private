import type { SupabaseClient } from '@supabase/supabase-js'
import { PLAN_SMS_LIMITS } from '@/types'

export interface SmsLimitResult {
  allowed: boolean
  used: number
  limit: number
  remaining: number
}

// 월간 발송 한도 확인 및 카운트 증가 (원자적)
export async function checkAndIncrementSmsLimit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  businessId: string,
  planType: string = 'free',
): Promise<SmsLimitResult> {
  const limit = PLAN_SMS_LIMITS[planType] ?? PLAN_SMS_LIMITS.free
  const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

  const { data: biz, error } = await supabase
    .schema('ilitda')
    .from('businesses')
    .select('monthly_sms_count, monthly_sms_reset_date')
    .eq('id', businessId)
    .single()

  if (error || !biz) throw new Error('업체 정보를 불러올 수 없습니다.')

  // reset_date가 이번 달이 아니면 새 월 → 카운트 초기화
  const isNewMonth = !biz.monthly_sms_reset_date ||
    !(biz.monthly_sms_reset_date as string).startsWith(thisMonth)
  const currentCount = isNewMonth ? 0 : (biz.monthly_sms_count ?? 0)

  if (currentCount >= limit) {
    return { allowed: false, used: currentCount, limit, remaining: 0 }
  }

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (리셋 시점 기록)
  await supabase
    .schema('ilitda')
    .from('businesses')
    .update({
      monthly_sms_count:      currentCount + 1,
      monthly_sms_reset_date: today,
    })
    .eq('id', businessId)

  return {
    allowed:   true,
    used:      currentCount + 1,
    limit,
    remaining: limit - currentCount - 1,
  }
}
