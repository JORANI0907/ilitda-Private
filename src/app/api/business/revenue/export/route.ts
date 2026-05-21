import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

// 국세청 e세금계산서 일괄발행 열 인덱스 (A=0 ~ BG=58)
const C = {
  A: 0,   B: 1,   C: 2,   D: 3,   E: 4,   F: 5,   G: 6,
  H: 7,   I: 8,   J: 9,   K: 10,  L: 11,  M: 12,  N: 13,
  O: 14,  P: 15,  Q: 16,  R: 17,  S: 18,  T: 19,  U: 20,
  V: 21,  W: 22,  X: 23,  Y: 24,  Z: 25,  AA: 26, AB: 27,
  AC: 28, AD: 29, BG: 58,
} as const

function emptyRow(): unknown[] {
  return Array(59).fill(null)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: business } = await service
    .from('businesses')
    .select('id, business_name, registration_number, representative_name, address')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { scheduleIds } = (await req.json()) as { scheduleIds: string[] }
  if (!scheduleIds?.length) {
    return NextResponse.json({ success: false, error: '선택된 항목이 없습니다.' }, { status: 400 })
  }

  const { data: rows } = await service
    .from('service_applications')
    .select('id, construction_date, care_scope, supply_amount, vat, unit_price_per_visit, business_name, owner_name, business_number, address, email')
    .in('id', scheduleIds)
    .eq('business_id', business.id)
    .order('construction_date', { ascending: true })

  const today = new Date()
  const todayNum = Number(
    `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  )
  const myRegNum = ((business.registration_number as string | null) ?? '').replace(/-/g, '')
  const myName   = (business.business_name as string | null) ?? ''
  const myRep    = (business.representative_name as string | null) ?? ''
  const myAddr   = (business.address as string | null) ?? ''
  const myEmail  = user.email ?? ''

  // 행 6 (인덱스 5): 열 헤더
  const headerRow = emptyRow()
  const headerLabels: [number, string][] = [
    [C.A,  '종류코드'],
    [C.B,  '작성일자'],
    [C.C,  '공급자사업자번호'],
    [C.D,  '공급자종사업장번호'],
    [C.E,  '공급자상호'],
    [C.F,  '공급자성명'],
    [C.G,  '공급자주소'],
    [C.H,  '공급자업태'],
    [C.I,  '공급자종목'],
    [C.J,  '공급자이메일'],
    [C.K,  '공급받는자사업자번호'],
    [C.L,  '공급받는자종사업장번호'],
    [C.M,  '공급받는자상호'],
    [C.N,  '공급받는자성명'],
    [C.O,  '공급받는자주소'],
    [C.P,  '공급받는자업태'],
    [C.Q,  '공급받는자종목'],
    [C.R,  '공급받는자이메일'],
    [C.S,  '비고'],
    [C.T,  '공급가액합계'],
    [C.U,  '세액합계'],
    [C.V,  '이메일전송여부'],
    [C.W,  '일자1'],
    [C.X,  '품목1'],
    [C.Y,  '규격1'],
    [C.Z,  '수량1'],
    [C.AA, '단가1'],
    [C.AB, '공급가액1'],
    [C.AC, '세액1'],
    [C.AD, '비고1'],
    [C.BG, '영수/청구'],
  ]
  for (const [idx, label] of headerLabels) headerRow[idx] = label

  // 행 7+ (인덱스 6+): 데이터
  const dataRows = ((rows ?? []) as Record<string, unknown>[]).map((s) => {
    // supply_amount = 합계(VAT 포함), unit_price_per_visit = 공급가액(VAT 제외), vat = 세액
    const supplyAmount = Number((s.unit_price_per_visit as string | number | null) ?? 0)
    const vatAmount    = Number((s.vat as string | number | null) ?? 0)

    const constructionDate = s.construction_date as string  // YYYY-MM-DD
    const day = constructionDate.split('-')[2]               // DD (2자리)
    const clientRegNum = ((s.business_number as string | null) ?? '').replace(/-/g, '')

    const row = emptyRow()
    row[C.A]  = '01'
    row[C.B]  = todayNum
    row[C.C]  = myRegNum
    row[C.E]  = myName
    row[C.F]  = myRep
    row[C.G]  = myAddr
    row[C.J]  = myEmail
    row[C.K]  = clientRegNum || null
    row[C.M]  = (s.business_name as string | null) ?? ''
    row[C.N]  = (s.owner_name as string | null) ?? ''
    row[C.O]  = (s.address as string | null) ?? ''
    row[C.R]  = (s.email as string | null) ?? ''
    row[C.T]  = supplyAmount
    row[C.U]  = vatAmount
    row[C.W]  = day
    row[C.X]  = (s.care_scope as string | null) ?? ''
    row[C.Z]  = 1
    row[C.AA] = supplyAmount
    row[C.AB] = supplyAmount
    row[C.AC] = vatAmount
    row[C.BG] = '01'

    return row
  })

  // 행 1~5: 빈 행, 행 6: 헤더, 행 7+: 데이터
  const aoa: unknown[][] = [
    emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow(),
    headerRow,
    ...dataRows,
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  ws['!cols'] = [
    { wch: 8 },  // A 종류코드
    { wch: 12 }, // B 작성일자
    { wch: 14 }, // C 공급자사업자번호
    { wch: 8 },  // D 종사업장
    { wch: 20 }, // E 공급자상호
    { wch: 12 }, // F 공급자성명
    { wch: 28 }, // G 공급자주소
    { wch: 10 }, // H 업태
    { wch: 10 }, // I 종목
    { wch: 24 }, // J 공급자이메일
    { wch: 14 }, // K 공급받는자사업자번호
    { wch: 8 },  // L 종사업장
    { wch: 20 }, // M 공급받는자상호
    { wch: 12 }, // N 공급받는자성명
    { wch: 28 }, // O 공급받는자주소
    { wch: 10 }, // P
    { wch: 10 }, // Q
    { wch: 24 }, // R 공급받는자이메일
    { wch: 10 }, // S
    { wch: 13 }, // T 공급가액합계
    { wch: 13 }, // U 세액합계
    { wch: 8 },  // V
    { wch: 6 },  // W 일자1
    { wch: 16 }, // X 품목1
    { wch: 8 },  // Y 규격1
    { wch: 6 },  // Z 수량1
    { wch: 13 }, // AA 단가1
    { wch: 13 }, // AB 공급가액1
    { wch: 13 }, // AC 세액1
    ...Array(29).fill({ wch: 8 }), // AD~BF
    { wch: 8 },  // BG 영수/청구
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '세금계산서')

  const todayStr = today.toISOString().slice(0, 10)
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`세금계산서_${todayStr}`)}.xlsx`,
    },
  })
}
