import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/solapi/client'

const DEMO_WORKERS = [
  { id: 'demo-worker-1', display_name: '김청소', manual_name: '김청소', manual_phone: '010-1111-1111', is_manual: true, status: 'accepted', profiles: null, invite_token: null, manual_account_bank: null, manual_account_number: null, manual_registration_number: null, manual_resident_number: null, manual_company_name: null },
  { id: 'demo-worker-2', display_name: '이세정', manual_name: '이세정', manual_phone: '010-2222-2222', is_manual: true, status: 'accepted', profiles: null, invite_token: null, manual_account_bank: null, manual_account_number: null, manual_registration_number: null, manual_resident_number: null, manual_company_name: null },
  { id: 'demo-worker-3', display_name: '박일꾼', manual_name: '박일꾼', manual_phone: '010-3333-3333', is_manual: true, status: 'accepted', profiles: null, invite_token: null, manual_account_bank: null, manual_account_number: null, manual_registration_number: null, manual_resident_number: null, manual_company_name: null },
]

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: true, data: DEMO_WORKERS, isDemo: true })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const service = createServiceClient()

  const { data: business, error: bizError } = await service
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (bizError || !business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  let query = service
    .from('connections')
    .select('*, profiles!worker_profile_id(name, phone)')
    .eq('business_id', business.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (status && ['pending', 'accepted'].includes(status)) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body: unknown = await request.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const {
    type,
    name,
    phone,
    account_bank,
    account_number,
    registration_number,
    resident_number,
    company_name,
    address,
  } = body as Record<string, unknown>

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ success: false, error: '이름을 입력해 주세요.' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: business, error: bizError } = await service
    .from('businesses')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (bizError || !business) {
    return NextResponse.json({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const isInvite = type === 'invite'
  const nameStr = (name as string).trim()
  const phoneStr = phone && typeof phone === 'string' ? (phone as string).trim() || null : null

  const insertData: Record<string, unknown> = {
    business_id: business.id,
    display_name: nameStr,
    manual_name: nameStr,
    manual_phone: phoneStr,
    is_manual: !isInvite,
    status: isInvite ? 'pending' : 'accepted',
  }

  if (!isInvite) {
    if (account_bank && typeof account_bank === 'string') insertData.manual_account_bank = account_bank.trim()
    if (account_number && typeof account_number === 'string') insertData.manual_account_number = account_number.trim()
    if (registration_number && typeof registration_number === 'string') insertData.manual_registration_number = registration_number.trim()
    if (resident_number && typeof resident_number === 'string') insertData.manual_resident_number = resident_number.trim()
    if (company_name && typeof company_name === 'string') insertData.manual_company_name = company_name.trim()
    if (address && typeof address === 'string') insertData.manual_address = address.trim()
  }

  const { data, error } = await service
    .from('connections')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  if (isInvite && phoneStr && data?.invite_token) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const inviteLink = `${appUrl}/connect/${data.invite_token}`
    try {
      await sendSMS(phoneStr, `[일잇다] 작업자 초대가 도착했습니다.\n수락 링크: ${inviteLink}`)
    } catch {
      // SMS 실패는 무시 — connection은 이미 생성됨
    }
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}
