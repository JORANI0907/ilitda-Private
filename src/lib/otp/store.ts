const OTP_TTL_MS = 5 * 60 * 1000 // 5분

interface OtpEntry {
  code: string
  expiresAt: number
}

// Next.js 서버 모듈 캐시를 이용한 인메모리 OTP 저장소
// 단일 서버 인스턴스 환경에서만 동작 (멀티 인스턴스 시 Redis로 교체 필요)
const otpMap = new Map<string, OtpEntry>()

export function storeOtp(phone: string, code: string): void {
  otpMap.set(phone, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
  })
}

export function verifyOtp(phone: string, code: string): boolean {
  const entry = otpMap.get(phone)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    otpMap.delete(phone)
    return false
  }
  if (entry.code !== code) return false
  otpMap.delete(phone)
  return true
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
