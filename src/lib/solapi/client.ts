import crypto from 'crypto'

const SOLAPI_API_URL = 'https://api.solapi.com/messages/v4/send'

function buildHmacSignature(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString()
  const salt = crypto.randomBytes(16).toString('hex')
  const data = `${date}${salt}`
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(data)
    .digest('hex')
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`
}

export async function sendSMS(to: string, text: string, fromPhone?: string): Promise<void> {
  if (process.env.NEXT_PUBLIC_APP_ENV === 'development') {
    return
  }

  const apiKey = process.env.SOLAPI_API_KEY
  const apiSecret = process.env.SOLAPI_API_SECRET
  const senderPhone = fromPhone ?? process.env.SOLAPI_FROM_PHONE

  if (!apiKey || !apiSecret || !senderPhone) {
    throw new Error('Solapi 환경변수가 설정되지 않았습니다')
  }

  const authorization = buildHmacSignature(apiKey, apiSecret)

  const response = await fetch(SOLAPI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({
      message: {
        to,
        from: senderPhone,
        text,
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Solapi SMS 발송 실패: ${response.status} ${errorBody}`)
  }
}
