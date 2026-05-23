'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, RefreshCw, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'

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

type SlackTestState = 'idle' | 'loading' | 'success' | 'error'

const ENV_GROUPS: Array<{
  label: string
  keys: (keyof EnvVarStatus)[]
}> = [
  {
    label: 'Supabase',
    keys: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  },
  {
    label: 'Solapi',
    keys: ['SOLAPI_API_KEY', 'SOLAPI_API_SECRET', 'SOLAPI_FROM_PHONE'],
  },
  {
    label: 'Google',
    keys: ['GOOGLE_SERVICE_ACCOUNT_JSON'],
  },
  {
    label: 'Slack',
    keys: ['SLACK_WEBHOOK_URL'],
  },
]

const TABLE_LABELS: Record<keyof TableCounts, string> = {
  businesses: '사업자',
  profiles: '프로필',
  service_applications: '서비스 신청서',
  connections: '직원 연결',
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${ok ? 'bg-state-success' : 'bg-state-danger'}`}
    />
  )
}

export default function AdminDevPage() {
  const router = useRouter()
  const [health, setHealth] = useState<HealthData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [slackState, setSlackState] = useState<SlackTestState>('idle')

  const fetchHealth = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/admin/dev/health')
      const json = await res.json()
      if (!json.success) {
        setLoadError(json.error ?? '불러오기 실패')
        return
      }
      setHealth(json.data)
    } catch {
      setLoadError('네트워크 오류')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  async function handleSlackTest() {
    setSlackState('loading')
    try {
      const res = await fetch('/api/admin/dev/test-slack', { method: 'POST' })
      const json = await res.json()
      setSlackState(json.success ? 'success' : 'error')
    } catch {
      setSlackState('error')
    } finally {
      setTimeout(() => setSlackState('idle'), 2000)
    }
  }

  function formatCheckedAt(iso: string) {
    const d = new Date(iso)
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-24">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-sunken text-text-secondary hover:bg-border transition-colors shrink-0"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <SectionHeader
            title="개발자 도구"
            description="시스템 상태 및 환경 점검"
            level="page"
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchHealth}
          disabled={isLoading}
          className="shrink-0 flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          새로고침
        </Button>
      </div>

      {/* 로드 오류 */}
      {!isLoading && loadError && (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-state-danger">{loadError}</p>
          <Button variant="secondary" size="sm" onClick={fetchHealth}>
            재시도
          </Button>
        </div>
      )}

      {/* 섹션 1: 시스템 상태 */}
      <section className="flex flex-col gap-3">
        <SectionHeader title="시스템 상태" level="section" />

        <Card padding="md">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              <div className="h-5 w-32 bg-surface-sunken rounded animate-pulse" />
              <div className="h-4 w-24 bg-surface-sunken rounded animate-pulse" />
              <div className="h-4 w-40 bg-surface-sunken rounded animate-pulse" />
            </div>
          ) : health ? (
            <div className="flex flex-col gap-4">
              {/* DB 연결 상태 */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
                  DB 연결
                </p>
                <div className="flex items-center gap-2">
                  <StatusDot ok={health.database.status === 'ok'} />
                  {health.database.status === 'ok' ? (
                    <span className="text-sm text-state-success font-medium">
                      연결됨 ({health.database.latencyMs}ms)
                    </span>
                  ) : (
                    <span className="text-sm text-state-danger font-medium">연결 오류</span>
                  )}
                </div>
              </div>

              {/* 테이블 통계 */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
                  테이블 통계
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(TABLE_LABELS) as (keyof TableCounts)[]).map((key) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-xl bg-surface-sunken px-3 py-2"
                    >
                      <span className="text-xs text-text-secondary">{TABLE_LABELS[key]}</span>
                      <span className="text-sm font-semibold text-text-primary">
                        {health.database.tables[key].toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 마지막 확인 시각 */}
              <p className="text-xs text-text-tertiary text-right">
                마지막 확인: {formatCheckedAt(health.checkedAt)}
              </p>
            </div>
          ) : null}
        </Card>
      </section>

      {/* 섹션 2: 환경변수 체크 */}
      <section className="flex flex-col gap-3">
        <SectionHeader title="환경변수 체크" level="section" />

        {isLoading ? (
          <Card padding="md">
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 w-full bg-surface-sunken rounded animate-pulse" />
              ))}
            </div>
          </Card>
        ) : health ? (
          <div className="flex flex-col gap-3">
            {ENV_GROUPS.map((group) => (
              <Card key={group.label} padding="md">
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-2">
                    {group.keys.map((key) => {
                      const isSet = health.envVars[key]
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <StatusDot ok={isSet} />
                          <span className="text-xs font-mono text-text-secondary flex-1 min-w-0 truncate">
                            {key}
                          </span>
                          <span
                            className={`text-xs font-medium shrink-0 ${
                              isSet ? 'text-state-success' : 'text-state-danger'
                            }`}
                          >
                            {isSet ? '설정됨' : '미설정'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </section>

      {/* 섹션 3: 테스트 도구 */}
      <section className="flex flex-col gap-3">
        <SectionHeader title="테스트 도구" level="section" />

        <Card padding="md">
          <div className="flex flex-col gap-4">
            {/* Slack 웹훅 테스트 */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm font-medium text-text-primary">Slack 웹훅 테스트</p>
                <p className="text-xs text-text-tertiary">어드민 채널로 테스트 핑을 발송합니다</p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSlackTest}
                  isLoading={slackState === 'loading'}
                  disabled={slackState === 'loading'}
                  className="flex items-center gap-1.5"
                >
                  {slackState === 'idle' && <Zap size={14} />}
                  {slackState === 'idle' && '테스트 발송'}
                  {slackState === 'loading' && '발송 중'}
                  {slackState === 'success' && '발송됨'}
                  {slackState === 'error' && '발송 실패'}
                </Button>
                {slackState === 'success' && (
                  <span className="text-xs text-state-success">Slack 메시지 발송됨</span>
                )}
                {slackState === 'error' && (
                  <span className="text-xs text-state-danger">발송 실패</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
