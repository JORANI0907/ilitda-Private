import nodemailer from 'nodemailer'

function createTransporter() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return null

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

export async function sendQuoteEmail({
  to,
  ownerName,
  companyName,
  quoteNo,
  businessName,
  constructionDate,
  supplyAmount,
  vat,
  totalAmount,
  validUntil,
  pdfUrl,
}: {
  to: string
  ownerName: string
  companyName: string
  quoteNo: string
  businessName: string
  constructionDate: string
  supplyAmount: number
  vat: number
  totalAmount: number
  validUntil: string
  pdfUrl?: string
}): Promise<void> {
  const transporter = createTransporter()
  if (!transporter) {
    console.warn('[email] GMAIL_USER 또는 GMAIL_APP_PASSWORD 미설정 — 이메일 발송 건너뜀')
    return
  }

  const fromEmail = process.env.GMAIL_USER!
  const fmtKr = (n: number) => n.toLocaleString('ko-KR')
  const subject = `[${companyName}] 견적서 안내 (${quoteNo})`

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;color:#333;line-height:1.7;max-width:600px;margin:0 auto;padding:24px;">
  <p>안녕하세요, <strong>${ownerName}</strong>님.</p>
  <p>${companyName} 견적서를 보내드립니다.</p>
  <table style="border-collapse:collapse;margin:16px 0;width:100%;">
    <tr style="border-bottom:1px solid #eee;"><td style="padding:6px 16px 6px 0;color:#888;white-space:nowrap;">견적서 번호</td><td>${quoteNo}</td></tr>
    <tr style="border-bottom:1px solid #eee;"><td style="padding:6px 16px 6px 0;color:#888;white-space:nowrap;">업체명</td><td>${businessName || '-'}</td></tr>
    <tr style="border-bottom:1px solid #eee;"><td style="padding:6px 16px 6px 0;color:#888;white-space:nowrap;">서비스일자</td><td>${constructionDate || '-'}</td></tr>
    <tr style="border-bottom:1px solid #eee;"><td style="padding:6px 16px 6px 0;color:#888;white-space:nowrap;">공급가액</td><td>${fmtKr(supplyAmount)}원</td></tr>
    <tr style="border-bottom:1px solid #eee;"><td style="padding:6px 16px 6px 0;color:#888;white-space:nowrap;">부가세</td><td>${fmtKr(vat)}원</td></tr>
    <tr style="border-bottom:1px solid #eee;"><td style="padding:6px 16px 6px 0;color:#888;white-space:nowrap;">합계</td><td><strong>${fmtKr(totalAmount)}원</strong></td></tr>
    <tr><td style="padding:6px 16px 6px 0;color:#888;white-space:nowrap;">유효기간</td><td>${validUntil}까지</td></tr>
  </table>
  ${pdfUrl ? `<p><a href="${pdfUrl}" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;">견적서 바로보기</a></p>` : ''}
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="margin:0;">감사합니다.<br><strong>${companyName}</strong></p>
</body>
</html>`

  await transporter.sendMail({
    from: `${companyName} <${fromEmail}>`,
    to,
    subject,
    html,
  })
}
