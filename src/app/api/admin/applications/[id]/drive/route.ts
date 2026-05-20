import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createApplicationFolder } from '@/lib/google/drive'
import type { ApiResponse } from '@/types'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json<ApiResponse>({ success: false, error: '인증 필요' }, { status: 401 })
  }

  const service = createServiceClient()

  const { data: biz } = await service
    .schema('ilitda')
    .from('businesses')
    .select('drive_root_folder_id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!biz) {
    return NextResponse.json<ApiResponse>({ success: false, error: '업체 정보를 찾을 수 없습니다.' }, { status: 403 })
  }

  if (!biz.drive_root_folder_id) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '구글 드라이브가 연동되지 않았습니다. 설정 > 연동 설정에서 먼저 연동해주세요.',
    }, { status: 400 })
  }

  const { data: app } = await service
    .schema('ilitda')
    .from('service_applications')
    .select('business_name, owner_name, construction_date')
    .eq('id', id)
    .single()

  if (!app) {
    return NextResponse.json<ApiResponse>({ success: false, error: '신청서를 찾을 수 없습니다.' }, { status: 404 })
  }

  try {
    const clientName = (app.business_name || app.owner_name || '고객').replace(/[/\\?%*:|"<>]/g, '_')
    const date = app.construction_date ?? new Date().toISOString().slice(0, 10)

    const folderUrl = await createApplicationFolder(biz.drive_root_folder_id, clientName, date)

    await service
      .schema('ilitda')
      .from('service_applications')
      .update({ drive_folder_url: folderUrl })
      .eq('id', id)

    return NextResponse.json<ApiResponse<{ folderUrl: string }>>({ success: true, data: { folderUrl } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Drive 폴더 생성 실패'
    return NextResponse.json<ApiResponse>({ success: false, error: msg }, { status: 500 })
  }
}
