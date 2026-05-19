import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// otp_cache는 public 스키마에 위치 (PostgREST 기본 노출 스키마)
function createOtpClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function storeOtp(phone: string, code: string): Promise<void> {
  const supabase = createOtpClient()

  const { error: delError } = await supabase
    .from('otp_cache')
    .delete()
    .eq('phone', phone)

  if (delError) {
    throw new Error(`OTP 삭제 실패: ${delError.message} (code: ${delError.code})`)
  }

  const { error: insError } = await supabase
    .from('otp_cache')
    .insert({ phone, code })

  if (insError) {
    throw new Error(`OTP 저장 실패: ${insError.message} (code: ${insError.code})`)
  }
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const supabase = createOtpClient()

  const { data, error } = await supabase
    .from('otp_cache')
    .select('code, expires_at')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`OTP 조회 실패: ${error.message} (code: ${error.code})`)
  }

  if (!data) return false
  if (new Date(data.expires_at) < new Date()) return false
  if (data.code !== code) return false

  await supabase.from('otp_cache').delete().eq('phone', phone)
  return true
}
