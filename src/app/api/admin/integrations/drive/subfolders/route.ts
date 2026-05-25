import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json<ApiResponse>({ success: false, error: '인증 필요' }, { status: 401 })
  }

  const body = await req.json()
  const subfolders: unknown = body.subfolders

  if (!Array.isArray(subfolders) || subfolders.length === 0) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: '폴더는 최소 1개 이상이어야 합니다.' },
      { status: 400 }
    )
  }

  const names = (subfolders as unknown[]).map(s => String(s).trim()).filter(Boolean)
  if (names.length === 0) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: '유효한 폴더 이름이 없습니다.' },
      { status: 400 }
    )
  }

  const service = createServiceClient()
  const { error } = await service
    .schema('ilitda')
    .from('businesses')
    .update({ drive_subfolders: names })
    .eq('profile_id', user.id)

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json<ApiResponse<{ subfolders: string[] }>>({ success: true, data: { subfolders: names } })
}
