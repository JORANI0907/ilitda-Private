import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, ServiceApplication } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''
  const status = searchParams.get('status') || ''
  const favorite = searchParams.get('favorite') === '1'

  try {
    let query = supabase
      .schema('ilitda')
      .from('service_applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (favorite) query = query.eq('is_favorite', true)
    if (status) query = query.eq('status', status)
    if (q) {
      query = query.or(
        `business_name.ilike.%${q}%,owner_name.ilike.%${q}%,phone.ilike.%${q}%`
      )
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json<ApiResponse<ServiceApplication[]>>({ success: true, data: data ?? [] })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '조회 실패'
    return NextResponse.json<ApiResponse>({ success: false, error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  try {
    const body = await req.json()

    const { data, error } = await supabase
      .schema('ilitda')
      .from('service_applications')
      .insert([body])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json<ApiResponse<ServiceApplication>>({ success: true, data }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '저장 실패'
    return NextResponse.json<ApiResponse>({ success: false, error: msg }, { status: 500 })
  }
}
