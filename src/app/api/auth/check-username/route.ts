import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase() ?? ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: true, data: { available: false } })
  }

  const service = createServiceClient()
  const { data } = await service
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  return NextResponse.json({ success: true, data: { available: !data } })
}
