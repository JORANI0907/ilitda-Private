import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createAndShareBusinessFolder } from '@/lib/google/drive'
import type { ApiResponse } from '@/types'

async function getAuthBusiness() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const service = createServiceClient()
  const { data: biz } = await service
    .schema('ilitda')
    .from('businesses')
    .select('id, business_name, gmail_for_drive, drive_root_folder_id')
    .eq('profile_id', user.id)
    .maybeSingle()

  return biz ? { supabase: service, biz } : null
}

// PATCH: Gmail 저장 + Drive 폴더 생성/공유
export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse<{ folderId: string }>>> {
  const auth = await getAuthBusiness()
  if (!auth) return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })

  const { gmail } = await req.json() as { gmail: string }
  if (!gmail || !gmail.includes('@')) {
    return NextResponse.json({ success: false, error: '올바른 Gmail 주소를 입력해주세요.' }, { status: 400 })
  }

  try {
    const folderId = await createAndShareBusinessFolder(
      auth.biz.business_name ?? '업체',
      gmail,
    )

    await auth.supabase
      .schema('ilitda')
      .from('businesses')
      .update({ gmail_for_drive: gmail, drive_root_folder_id: folderId })
      .eq('id', auth.biz.id)

    return NextResponse.json({ success: true, data: { folderId } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '드라이브 연동 실패'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// DELETE: Drive 연동 해제
export async function DELETE(): Promise<NextResponse<ApiResponse>> {
  const auth = await getAuthBusiness()
  if (!auth) return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })

  await auth.supabase
    .schema('ilitda')
    .from('businesses')
    .update({ gmail_for_drive: null, drive_root_folder_id: null })
    .eq('id', auth.biz.id)

  return NextResponse.json({ success: true })
}
