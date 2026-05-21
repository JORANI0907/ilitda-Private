import { NextRequest, NextResponse } from 'next/server'
import { tmpdir } from 'os'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { renderQuotePdf, type QuotePdfData } from '@/lib/quotePdf'
import { sendSMS } from '@/lib/solapi/client'
import { sendQuoteEmail } from '@/lib/email'

export const maxDuration = 60

interface QuoteItem {
  name: string
  qty: number
  unit_price: number
  subtotal: number
}

interface QuoteLogEntry {
  quote_no: string
  pdf_url: string | null
  sent_at: string
  total_amount: number
}

interface QuoteSendBody {
  company_name: string
  company_ceo: string
  company_biz_no: string
  company_phone: string
  company_address: string
  owner_name: string
  business_name: string
  phone: string
  email: string
  address: string
  construction_date: string
  quote_items: QuoteItem[]
  supply_amount: number
  vat: number
  total_amount: number
  valid_days?: number
  notes?: string
  hide_item_prices?: boolean
  seal_image_url?: string
}

function generateQuoteNo(bizId: string): string {
  const now = new Date()
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  const d = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`
  const prefix = bizId.slice(0, 4).toUpperCase()
  return `ILT-${prefix}-${d}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const service = createServiceClient()
  const { data: biz } = await service.schema('ilitda').from('businesses')
    .select('id').eq('profile_id', user.id).maybeSingle()
  if (!biz) return NextResponse.json({ error: '사업자 정보 없음' }, { status: 403 })

  const body: QuoteSendBody = await req.json()
  const {
    company_name, company_ceo, company_biz_no, company_phone, company_address,
    owner_name, business_name, phone, email, address,
    construction_date, quote_items, supply_amount, vat, total_amount,
    valid_days, notes, hide_item_prices, seal_image_url,
  } = body

  const todayStr      = new Date().toISOString().slice(0, 10)
  const validUntilStr = addDays(todayStr, valid_days ?? 5)
  const quoteNo       = generateQuoteNo(biz.id)
  const fmtKr         = (n: number) => n.toLocaleString('ko-KR')
  const safeVat       = vat ?? 0

  let pdfUrl: string | undefined
  const errors: Record<string, string>     = {}
  const softErrors: Record<string, string> = {}

  // ── 0. 인감 이미지 → 임시 파일 ─────────────────────────────────
  // @react-pdf/renderer v4는 data URL MIME 파싱 버그로 로컬 파일 경로 필요
  let sealTmpPath: string | undefined
  if (seal_image_url) {
    try {
      const imgRes = await fetch(seal_image_url)
      if (imgRes.ok) {
        const imgBuf = Buffer.from(await imgRes.arrayBuffer())
        sealTmpPath  = join(tmpdir(), `ilt-seal-${Date.now()}.png`)
        await writeFile(sealTmpPath, imgBuf)
      }
    } catch {
      // 인감 없이 PDF 생성 계속
    }
  }

  // ── 1. PDF 생성 ─────────────────────────────────────────────────
  let pdfBuffer: Buffer | undefined
  try {
    const pdfData: QuotePdfData = {
      quoteNo,
      createdAt:        todayStr,
      validUntil:       validUntilStr,
      companyName:      company_name    || '',
      companyCeo:       company_ceo     || '',
      companyBizNo:     company_biz_no  || '',
      companyPhone:     company_phone   || '',
      companyAddress:   company_address || '',
      ownerName:        owner_name        || '',
      businessName:     business_name     || '',
      phone:            phone             || '',
      email:            email             || '',
      address:          address           || '',
      constructionDate: construction_date || '',
      quoteItems:       quote_items,
      supplyAmount:     supply_amount || 0,
      vat:              safeVat,
      totalAmount:      total_amount  || 0,
      notes:            notes || undefined,
      hideItemPrices:   hide_item_prices ?? false,
      sealImageUrl:     sealTmpPath,
    }
    pdfBuffer = await renderQuotePdf(pdfData)
  } catch (e) {
    errors.pdf = e instanceof Error ? e.message : String(e)
  } finally {
    if (sealTmpPath) unlink(sealTmpPath).catch(() => {})
  }

  // ── 2. Supabase Storage 업로드 ──────────────────────────────────
  if (pdfBuffer) {
    try {
      const fileName = `${biz.id}/${quoteNo}.pdf`
      const { error: uploadError } = await service.storage
        .from('quote-pdfs')
        .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = service.storage
        .from('quote-pdfs')
        .getPublicUrl(fileName)
      pdfUrl = urlData.publicUrl
    } catch (e) {
      errors.upload = e instanceof Error ? e.message : String(e)
    }
  }

  // ── 3. 이메일 발송 (Gmail) ──────────────────────────────────────
  if (email) {
    try {
      await sendQuoteEmail({
        to:               email,
        ownerName:        owner_name       || '',
        companyName:      company_name     || '',
        quoteNo,
        businessName:     business_name    || '',
        constructionDate: construction_date || '',
        supplyAmount:     supply_amount    || 0,
        vat:              safeVat,
        totalAmount:      total_amount     || 0,
        validUntil:       validUntilStr,
        pdfUrl,
      })
    } catch (e) {
      softErrors.email = e instanceof Error ? e.message : String(e)
    }
  }

  // ── 4. SMS 발송 ─────────────────────────────────────────────────
  if (phone) {
    try {
      const smsText = [
        `[${company_name}] 견적서가 발송되었습니다.`,
        `견적번호: ${quoteNo}`,
        `금액: ${fmtKr(total_amount || 0)}원`,
        `유효기간: ${validUntilStr}까지`,
        ...(pdfUrl ? [`견적서: ${pdfUrl}`] : []),
      ].join('\n')

      await sendSMS(phone, smsText)
    } catch (e) {
      softErrors.sms = e instanceof Error ? e.message : String(e)
    }
  }

  // ── 5. DB 저장 ──────────────────────────────────────────────────
  try {
    const { data: current } = await service.schema('ilitda')
      .from('service_applications')
      .select('quote_log')
      .eq('id', id)
      .eq('business_id', biz.id)
      .single()

    const existingLog: QuoteLogEntry[] = Array.isArray(current?.quote_log) ? current.quote_log : []
    const newEntry: QuoteLogEntry = {
      quote_no:     quoteNo,
      pdf_url:      pdfUrl || null,
      sent_at:      new Date().toISOString(),
      total_amount: total_amount || 0,
    }

    await service.schema('ilitda')
      .from('service_applications')
      .update({
        last_quote_no:      quoteNo,
        last_quote_pdf_url: pdfUrl || null,
        quote_items,
        quote_sent_at:      new Date().toISOString(),
        quote_log:          [...existingLog, newEntry],
      })
      .eq('id', id)
      .eq('business_id', biz.id)
  } catch (e) {
    errors.db = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({
    success:  Object.keys(errors).length === 0,
    quote_no: quoteNo,
    pdf_url:  pdfUrl,
    ...(Object.keys(errors).length     > 0 && { errors }),
    ...(Object.keys(softErrors).length > 0 && { warnings: softErrors }),
  })
}
