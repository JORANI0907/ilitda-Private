import { createServiceClient } from '@/lib/supabase/server'

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function storeOtp(phone: string, code: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from('otp_cache').delete().eq('phone', phone)
  await supabase.from('otp_cache').insert({ phone, code })
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('otp_cache')
    .select('code, expires_at')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return false
  if (new Date(data.expires_at) < new Date()) return false
  if (data.code !== code) return false

  await supabase.from('otp_cache').delete().eq('phone', phone)
  return true
}
