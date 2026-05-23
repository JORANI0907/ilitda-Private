import crypto from 'crypto'

const BASE = 'https://api.solapi.com/callers/v1'

function buildAuth(): string {
  const apiKey    = process.env.SOLAPI_API_KEY
  const apiSecret = process.env.SOLAPI_API_SECRET
  if (!apiKey || !apiSecret) throw new Error('Solapi API 키가 설정되지 않았습니다.')

  const date = new Date().toISOString()
  const salt = crypto.randomBytes(8).toString('hex')
  const sig  = crypto.createHmac('sha256', apiSecret)
    .update(date + salt).digest('hex')
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${sig}`
}

// 1단계: 발신번호 등록 요청 → Solapi가 해당 번호로 OTP 발송
export async function requestSenderVerification(phoneNumber: string): Promise<string> {
  const res = await fetch(`${BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: buildAuth() },
    body: JSON.stringify({ phoneNumber, memo: '일잇다 발신번호 인증' }),
  })
  if (!res.ok) {
    let body = ''
    try { body = await res.text() } catch { /* ignore */ }
    throw new Error(`발신번호 등록 요청 실패 (${res.status}): ${body}`)
  }
  const json = await res.json() as { uniqueId: string }
  return json.uniqueId
}

// 2단계: OTP 검증 → 승인 완료
export async function verifySenderRegistration(uniqueId: string, otp: string): Promise<void> {
  const res = await fetch(`${BASE}/requests/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: buildAuth() },
    body: JSON.stringify({ uniqueId, otp }),
  })
  if (!res.ok) {
    let body = ''
    try { body = await res.text() } catch { /* ignore */ }
    throw new Error(`발신번호 인증 실패 (${res.status}): ${body}`)
  }
}

// 발신번호 삭제
export async function deleteSenderNumber(uniqueId: string): Promise<void> {
  const res = await fetch(`${BASE}/${uniqueId}`, {
    method: 'DELETE',
    headers: { Authorization: buildAuth() },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`발신번호 삭제 실패: ${body}`)
  }
}
