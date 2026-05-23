import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

interface TableCounts {
  businesses: number
  profiles: number
  service_applications: number
  connections: number
}

interface DatabaseHealth {
  status: 'ok' | 'error'
  latencyMs: number
  tables: TableCounts
}

interface EnvVarStatus {
  NEXT_PUBLIC_SUPABASE_URL: boolean
  NEXT_PUBLIC_SUPABASE_ANON_KEY: boolean
  SUPABASE_SERVICE_ROLE_KEY: boolean
  SOLAPI_API_KEY: boolean
  SOLAPI_API_SECRET: boolean
  SOLAPI_FROM_PHONE: boolean
  GOOGLE_SERVICE_ACCOUNT_JSON: boolean
  SLACK_WEBHOOK_URL: boolean
}

interface HealthData {
  database: DatabaseHealth
  envVars: EnvVarStatus
  checkedAt: string
}

async function checkAdmin(userId: string): Promise<boolean> {
  const service = createServiceClient()
  const { data } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle()
  return data?.is_admin === true
}

export async function GET(): Promise<NextResponse<ApiResponse<HealthData>>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
  }

  const isAdmin = await checkAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const service = createServiceClient()

  const start = Date.now()
  let dbStatus: 'ok' | 'error' = 'ok'
  const tables: TableCounts = {
    businesses: 0,
    profiles: 0,
    service_applications: 0,
    connections: 0,
  }

  try {
    const [businessesRes, profilesRes, applicationsRes, connectionsRes] = await Promise.all([
      service.from('businesses').select('*', { count: 'exact', head: true }),
      service.from('profiles').select('*', { count: 'exact', head: true }),
      service.from('service_applications').select('*', { count: 'exact', head: true }),
      service.from('connections').select('*', { count: 'exact', head: true }),
    ])

    if (businessesRes.error || profilesRes.error || applicationsRes.error || connectionsRes.error) {
      dbStatus = 'error'
    } else {
      tables.businesses = businessesRes.count ?? 0
      tables.profiles = profilesRes.count ?? 0
      tables.service_applications = applicationsRes.count ?? 0
      tables.connections = connectionsRes.count ?? 0
    }
  } catch {
    dbStatus = 'error'
  }

  const latencyMs = Date.now() - start

  const envVars: EnvVarStatus = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env['NEXT_PUBLIC_SUPABASE_URL'],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    SUPABASE_SERVICE_ROLE_KEY: !!process.env['SUPABASE_SERVICE_ROLE_KEY'],
    SOLAPI_API_KEY: !!process.env['SOLAPI_API_KEY'],
    SOLAPI_API_SECRET: !!process.env['SOLAPI_API_SECRET'],
    SOLAPI_FROM_PHONE: !!process.env['SOLAPI_FROM_PHONE'],
    GOOGLE_SERVICE_ACCOUNT_JSON: !!process.env['GOOGLE_SERVICE_ACCOUNT_JSON'],
    SLACK_WEBHOOK_URL: !!process.env['SLACK_WEBHOOK_URL'],
  }

  const result: HealthData = {
    database: {
      status: dbStatus,
      latencyMs,
      tables,
    },
    envVars,
    checkedAt: new Date().toISOString(),
  }

  return NextResponse.json({ success: true, data: result })
}
