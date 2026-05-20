import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, ServiceApplication } from '@/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .schema('ilitda')
    .from('service_applications')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 404 })
  return NextResponse.json<ApiResponse<ServiceApplication>>({ success: true, data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  try {
    const body = await req.json()
    const { data, error } = await supabase
      .schema('ilitda')
      .from('service_applications')
      .update(body)
      .eq('id', id)
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
  const supabase = createServiceClient()
  const { error } = await supabase
    .schema('ilitda')
    .from('service_applications')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json<ApiResponse>({ success: true })
}
