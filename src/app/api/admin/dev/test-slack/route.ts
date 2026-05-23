import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL ?? ''

async function checkAdmin(userId: string): Promise<boolean> {
  const service = createServiceClient()
  const { data } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle()
  return data?.is_admin === true
}

export async function POST(): Promise<NextResponse<ApiResponse<{ sent: boolean }>>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const isAdmin = await checkAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  try {
    const res = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '🔧 *개발자 도구 테스트* | 어드민 패널에서 전송한 테스트 핑입니다.',
      }),
    })

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Slack 응답 오류: ${res.status}` },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, data: { sent: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
