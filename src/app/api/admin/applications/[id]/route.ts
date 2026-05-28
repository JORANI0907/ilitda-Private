import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, ServiceApplication } from '@/types'

async function getBusinessId(userId: string): Promise<string | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .schema('ilitda')
    .from('businesses')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json<ApiResponse>({ success: false, error: '인증이 필요합니다.' }, { status: 401 })

  const businessId = await getBusinessId(user.id)
  if (!businessId) return NextResponse.json<ApiResponse>({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .schema('ilitda')
    .from('service_applications')
    .select('*')
    .eq('id', id)
    .eq('business_id', businessId)
    .single()

  if (error) return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 404 })
  return NextResponse.json<ApiResponse<ServiceApplication>>({ success: true, data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json<ApiResponse>({ success: false, error: '인증이 필요합니다.' }, { status: 401 })

  const businessId = await getBusinessId(user.id)
  if (!businessId) return NextResponse.json<ApiResponse>({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })

  const supabase = createServiceClient()
  try {
    const body = await req.json()
    const { data, error } = await supabase
      .schema('ilitda')
      .from('service_applications')
      .update(body)
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json<ApiResponse<ServiceApplication>>({ success: true, data })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '수정 실패'
    return NextResponse.json<ApiResponse>({ success: false, error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json<ApiResponse>({ success: false, error: '인증이 필요합니다.' }, { status: 401 })

  const businessId = await getBusinessId(user.id)
  if (!businessId) return NextResponse.json<ApiResponse>({ success: false, error: '사업자 정보를 찾을 수 없습니다.' }, { status: 404 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .schema('ilitda')
    .from('service_applications')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId)

  if (error) return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json<ApiResponse>({ success: true })
}
