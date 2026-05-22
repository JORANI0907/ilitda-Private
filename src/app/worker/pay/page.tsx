'use client'

import { useEffect, useState } from 'react'
import { Wallet, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { EarningsCard } from '@/components/worker/EarningsCard'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'
import type { PayrollStatus } from '@/types'

type Segment = 'current' | 'history'

// 이번달 배정 아이템 (API current 모드)
interface CurrentItem {
  id: string
  hourly_rate: number | null
  schedule: {
    service_date: string
    start_time: string
    end_time: string | null
    client: { name: string } | null
  } | null
  attendance: {
    total_minutes: number | null
    checkin_at: string | null
    checkout_at: string | null
  } | null | { total_minutes: number | null }[]
}

interface PayrollItem {
  id: string
  period_start: string
  period_end: string
  total_hours: number
  total_amount: number
  status: PayrollStatus
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour < 12 ? '오전' : '오후'
  return `${ampm} ${hour % 12 === 0 ? 12 : hour % 12}:${m ?? '00'}`
}

function getTotalMinutes(
  attendance: CurrentItem['attendance'],
): number | null {
  if (!attendance) return null
  if (Array.isArray(attendance)) {
    return attendance[0]?.total_minutes ?? null
  }
  return (attendance as { total_minutes: number | null }).total_minutes
}

function calcExpectedPay(items: CurrentItem[]): number {
  return items.reduce((sum, item) => {
    const minutes = getTotalMinutes(item.attendance)
    if (!item.hourly_rate || !minutes) return sum
    return sum + Math.round((item.hourly_rate * minutes) / 60)
  }, 0)
}

function calcTotalMinutes(items: CurrentItem[]): number {
  return items.reduce((sum, item) => sum + (getTotalMinutes(item.attendance) ?? 0), 0)
}

const HELP_SECTIONS = [
  {
    title: '이번 달 급여 확인',
    content: '"이번 달" 탭에서 이번 달 예상 급여와 작업별 내역을 확인할 수 있어요.\n실제 출퇴근 기록 시간을 기준으로 금액이 계산됩니다.',
  },
  {
    title: '지급 내역 확인',
    content: '"지난 내역" 탭에서 이전 달 정산이 완료된 급여 내역을 확인할 수 있어요.',
  },
]

export default function WorkerPayPage() {
  const [segment, setSegment] = useState<Segment>('current')
  const [currentItems, setCurrentItems] = useState<CurrentItem[]>([])
  const [payrolls, setPayrolls] = useState<PayrollItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/worker/payroll?mode=${segment}`)
        const json = await res.json()
        if (!json.success) return

        if (segment === 'current') {
          setCurrentItems(json.data ?? [])
        } else {
          setPayrolls(json.data ?? [])
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [segment])

  const expectedPay = calcExpectedPay(currentItems)
  const totalMinutes = calcTotalMinutes(currentItems)
  const totalHours = Math.floor(totalMinutes / 60)
  const totalRemainMins = totalMinutes % 60

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <SectionHeader title="정산" level="page" />

      <HelpBanner label="급여 확인 안내" onClick={() => setHelpOpen(true)} />
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="급여 확인 안내"
        sections={HELP_SECTIONS}
      />

      <HelpTip>급여는 사업자가 등록한 금액 기준으로 표시됩니다. 문의사항은 담당 사업자에게 연락하세요.</HelpTip>

      {/* 세그먼트 탭 */}
      <div className="flex gap-1 bg-surface-sunken rounded-xl p-1">
        {(['current', 'history'] as const).map((seg) => (
          <button
            key={seg}
            type="button"
            onClick={() => setSegment(seg)}
            className={`
              flex-1 h-9 rounded-lg text-sm font-medium transition-colors
              ${segment === seg
                ? 'bg-surface shadow-soft text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary'}
            `}
          >
            {seg === 'current' ? '이번 달' : '지난 내역'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface-sunken animate-pulse" />
          ))}
        </div>
      ) : segment === 'current' ? (
        <>
          {/* 예상 급여 배너 */}
          <Card padding="md" className="bg-brand-600 border-0">
            <p className="text-sm text-brand-200 mb-1">이번 달 예상 급여</p>
            <p className="text-3xl font-bold text-white">{expectedPay.toLocaleString()}원</p>
            <div className="mt-3 flex items-center gap-1.5 text-brand-200 text-xs">
              <Clock size={12} />
              <span>
                총 {totalHours}시간 {totalRemainMins > 0 ? `${totalRemainMins}분` : ''} 근무
              </span>
            </div>
          </Card>

          {/* 작업별 내역 */}
          <div className="flex flex-col gap-3">
            <SectionHeader title="작업 내역" />
            {currentItems.length === 0 ? (
              <EmptyState
                icon={<Wallet size={32} />}
                title="이번 달 작업 내역이 없습니다"
                description="배정된 일정을 완료하면 여기에 표시됩니다."
                bordered
                size="sm"
              />
            ) : (
              currentItems.map((item) => {
                const minutes = getTotalMinutes(item.attendance)
                const pay =
                  item.hourly_rate && minutes
                    ? Math.round((item.hourly_rate * minutes) / 60)
                    : null

                return (
                  <Card key={item.id} padding="sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {item.schedule?.client?.name ?? '고객 정보 없음'}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {item.schedule?.service_date
                            ? formatDate(item.schedule.service_date)
                            : '—'}
                          {item.schedule?.start_time
                            ? ` · ${formatTime(item.schedule.start_time)}`
                            : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {pay !== null ? (
                          <p className="text-sm font-bold text-text-primary">
                            {pay.toLocaleString()}원
                          </p>
                        ) : (
                          <p className="text-xs text-text-tertiary">미완료</p>
                        )}
                        {minutes && (
                          <p className="text-xs text-text-tertiary mt-0.5">
                            {Math.floor(minutes / 60)}h {minutes % 60}m
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </>
      ) : (
        /* 지난 내역 */
        <div className="flex flex-col gap-3">
          {payrolls.length === 0 ? (
            <EmptyState
              icon={<Wallet size={32} />}
              title="지난 정산 내역이 없습니다"
              description="정산이 완료되면 여기에 표시됩니다."
              bordered
            />
          ) : (
            payrolls.map((p) => (
              <EarningsCard
                key={p.id}
                periodStart={p.period_start}
                periodEnd={p.period_end}
                totalAmount={p.total_amount}
                totalHours={p.total_hours}
                status={p.status}
              />
            ))
          )}
        </div>
      )}

      <div className="h-4" />
    </div>
  )
}
