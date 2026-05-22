import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')?.trim().toLowerCase() ?? ''

  if (!/^[a-z0-9_]{4,20}$/.test(username)) {
    return NextResponse.json({
      success: true,
      data: { available: false, reason: '아이디는 4~20자 영문 소문자·숫자·_만 사용 가능합니다.' },
    })
  }

  const service = createServiceClient()
  const { data } = await service
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  return NextResponse.json({ success: true, data: { available: !data } })
}
