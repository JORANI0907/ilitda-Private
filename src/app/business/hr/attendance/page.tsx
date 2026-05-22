'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, CalendarDays, LogIn } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'
import { HelpIcon } from '@/components/ui/HelpIcon'

interface AttendanceRow {
  id: string
  checkin_at: string | null
  checkout_at: string | null
  total_minutes: number | null
  assignment: {
    id: string
    schedule: {
      service_date: string
      business_id: string
    } | null
    worker: {
      id: string
      profile: { name: string } | null
    } | null
  } | null
}

const HELP_SECTIONS = [
  {
    title: '근태 기록 방법',
    content: '① 직원이 현장에 도착하면 일잇다 앱에서 "출근" 버튼을 누릅니다.\n② 작업이 완료되면 "퇴근" 버튼을 누릅니다.\n③ 관리자 화면에 자동으로 기록됩니다.\n\n직원이 일잇다 앱을 설치하고 관리자가 보낸 초대 링크로 계정을 연결해야 합니다.',
  },
  {
    title: '기록 확인 방법',
    content: '날짜 입력 칸에서 원하는 날짜를 선택하면 해당 날짜의 전체 직원 출퇴근 현황을 한눈에 확인할 수 있습니다.\n\n기본값은 오늘 날짜입니다.',
  },
  {
    title: '기록이 없을 때',
    content: '다음 경우에 기록이 표시되지 않을 수 있습니다.\n\n• 직원이 출퇴근 체크를 하지 않은 경우\n• 직원 앱이 미연결 상태인 경우\n• 해당 날짜에 배정된 작업이 없는 경우\n\n기록이 없는 경우 직원에게 직접 연락하여 확인하세요.\n앱 미연결 직원은 HR 관리 > 직원 연결 메뉴에서 초대 링크를 다시 보낼 수 있습니다.',
  },
  {
    title: '근태 기록 확인 방법',
    content: '직원이 앱에서 출퇴근 체크를 하면 이 페이지에 자동으로 기록됩니다. 직원 이름, 출근·퇴근 시간, 총 근무 시간을 한눈에 확인할 수 있습니다.',
  },
  {
    title: '날짜별 필터 사용법',
    content: '날짜 입력 칸에서 원하는 날짜를 선택하면 해당 날짜의 기록만 표시됩니다. 기본값은 오늘 날짜입니다.',
  },
  {
    title: '직원이 출퇴근 체크하는 방법',
    content: '직원이 일잇다 앱을 설치하고 관리자가 보낸 초대 링크로 계정을 연결하면, 앱 내 출퇴근 버튼으로 현장에서 바로 체크할 수 있습니다.',
  },
]

export default function AttendancePage() {
  const today = new Date().toISOString().slice(0, 10)
  const [helpOpen, setHelpOpen] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [dateFilter, setDateFilter] = useState(today)
  const [records, setRecords] = useState<AttendanceRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/business/attendance?date=${dateFilter}`)
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '데이터를 불러오지 못했습니다.')
        return
      }
      setIsDemo(json.isDemo === true)
      setRecords(json.data ?? [])
    } catch {
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [dateFilter])

  useEffect(() => { fetchAttendance() }, [fetchAttendance])

  function formatTime(iso: string | null) {
    if (!iso) return '-'
    return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <SectionHeader title="출퇴근 기록" level="page" />

      {/* 데모 배너 */}
      {isDemo && (
        <div className="flex items-center justify-between gap-3 bg-brand-50 border border-brand-200 rounded-2xl px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-700">데모 모드로 둘러보는 중이에요</p>
            <p className="text-xs text-brand-600 mt-0.5 break-keep">가입하면 나만의 사업장을 관리할 수 있어요.</p>
          </div>
          <Link href="/login/register" className="flex-shrink-0 flex items-center gap-1.5 bg-brand-600 text-white text-xs font-semibold px-3 h-9 rounded-lg hover:bg-brand-700 transition-colors">
            <LogIn size={14} /> 가입하기
          </Link>
        </div>
      )}

      <HelpBanner label="근태 관리 사용법 보기" onClick={() => setHelpOpen(true)} />
      <HelpTip>직원이 현장에서 출퇴근 앱으로 체크하면 여기에 자동으로 기록됩니다. 직접 수정은 지원되지 않습니다.</HelpTip>
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="근태 관리 사용법"
        sections={HELP_SECTIONS}
      />

      {/* 날짜 필터 */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-tertiary">날짜 선택</span>
          <HelpIcon
            title="날짜 필터"
            description={`날짜를 선택하면 해당 날짜의 전체 직원 출퇴근 기록을 확인할 수 있습니다.\n\n기본값은 오늘 날짜입니다.`}
          />
        </div>
        <Input
          label="날짜"
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} padding="md">
            <div className="flex flex-col gap-2">
              <div className="h-4 w-24 bg-surface-sunken rounded animate-pulse" />
              <div className="h-3 w-40 bg-surface-sunken rounded animate-pulse" />
            </div>
          </Card>
        ))}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-state-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchAttendance}>재시도</Button>
          </div>
        )}

        {!isLoading && !error && records.length === 0 && (
          <EmptyState
            icon={<CalendarDays size={40} />}
            title="출퇴근 기록이 없어요"
            description={`${dateFilter} 날짜의 기록이 없습니다.`}
            bordered
          />
        )}

        {!isLoading && !error && records.map((r) => {
          const name = r.assignment?.worker?.profile?.name ?? '이름 없음'
          const workedMin = r.total_minutes ?? 0
          const workedHours = (workedMin / 60).toFixed(1)

          return (
            <Card key={r.id} padding="md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="font-semibold text-text-primary">{name}</span>
                  <div className="flex gap-4 text-sm text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-state-success shrink-0" />
                      출근 {formatTime(r.checkin_at)}
                      <HelpIcon
                        title="출근 시각"
                        description={`직원이 앱에서 '출근' 버튼을 누른 시각입니다.`}
                      />
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-state-danger shrink-0" />
                      퇴근 {formatTime(r.checkout_at)}
                      <HelpIcon
                        title="퇴근 시각"
                        description={`직원이 앱에서 '퇴근' 버튼을 누른 시각입니다.`}
                      />
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-text-primary">{workedHours}시간</p>
                  <p className="text-xs text-text-tertiary">{workedMin}분</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
