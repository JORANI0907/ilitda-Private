import crypto from 'crypto'

const BASE = 'https://api.solapi.com/users/v1/sender-id'

function auth() {
  const date = new Date().toISOString()
  const salt = crypto.randomBytes(8).toString('hex')
  const sig  = crypto.createHmac('sha256', process.env.SOLAPI_API_SECRET ?? '')
    .update(date + salt).digest('hex')
  return `HMAC-SHA256 ApiKey=${process.env.SOLAPI_API_KEY}, Date=${date}, salt=${salt}, signature=${sig}`
}

// 1단계: 발신번호 등록 요청 → Solapi가 해당 번호로 OTP 발송
export async function requestSenderVerification(phoneNumber: string): Promise<string> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth() },
    body: JSON.stringify({ phoneNumber, memo: '일잇다 발신번호 인증' }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`발신번호 등록 요청 실패: ${body}`)
  }
  const json = await res.json() as { uniqueId: string }
  return json.uniqueId
}

// 2단계: OTP 검증 → 승인 완료
export async function verifySenderRegistration(uniqueId: string, otp: string): Promise<void> {
  const res = await fetch(BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: auth() },
    body: JSON.stringify({ uniqueId, otp }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`발신번호 인증 실패: ${body}`)
  }
}

// 발신번호 삭제
export async function deleteSenderNumber(uniqueId: string): Promise<void> {
  const res = await fetch(`${BASE}/${uniqueId}`, {
    method: 'DELETE',
    headers: { Authorization: auth() },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`발신번호 삭제 실패: ${body}`)
  }
}
