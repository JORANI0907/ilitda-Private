'use client'

import { Calendar, Users, Briefcase, ChevronRight, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'

// 더미 데이터 — Day 3에서 Supabase 쿼리로 교체
const DUMMY_STATS = [
  { label: '이번 달 일정', value: '12건', icon: <Calendar size={20} />, color: 'text-brand-600' },
  { label: '등록 인력', value: '8명', icon: <Users size={20} />, color: 'text-state-success' },
  { label: '진행 중', value: '3건', icon: <Briefcase size={20} />, color: 'text-state-warning' },
]

const DUMMY_SCHEDULES = [
  { id: '1', client: '스타벅스 판교점', date: '5월 20일 오후 11시', type: '주방후드', status: 'in_progress' as const },
  { id: '2', client: '이마트 분당점', date: '5월 22일 오전 2시', type: '바닥코팅', status: 'scheduled' as const },
  { id: '3', client: '롯데리아 야탑점', date: '5월 25일 오후 10시', type: '에어컨', status: 'scheduled' as const },
]

const STATUS_MAP: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' | 'info' }> = {
  scheduled:   { label: '예정', variant: 'info' },
  in_progress: { label: '진행중', variant: 'primary' },
  completed:   { label: '완료', variant: 'success' },
}

export default function BusinessHomePage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      {/* 헤더 */}
      <div>
        <p className="text-sm text-text-secondary">안녕하세요</p>
        <h1 className="text-2xl font-bold text-text-primary leading-tight">범빌드코리아 님 👋</h1>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {DUMMY_STATS.map((stat) => (
          <Card key={stat.label} padding="sm" className="text-center">
            <span className={`${stat.color} flex justify-center mb-1`}>{stat.icon}</span>
            <p className="text-xl font-bold text-text-primary">{stat.value}</p>
            <p className="text-xs text-text-secondary mt-0.5 break-keep">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* 이번 주 매출 배너 */}
      <Card className="bg-brand-600 border-0" padding="md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-brand-200">이번 달 예상 매출</p>
            <p className="text-2xl font-bold text-white mt-0.5">4,320,000원</p>
          </div>
          <TrendingUp size={36} className="text-brand-300" />
        </div>
      </Card>

      {/* 예정 일정 */}
      <div className="flex flex-col gap-3">
        <SectionHeader
          title="예정 일정"
          action={
            <Button variant="ghost" size="sm" className="text-brand-600 px-0">
              전체보기 <ChevronRight size={14} />
            </Button>
          }
        />
        {DUMMY_SCHEDULES.map((s) => (
          <Card key={s.id} onClick={() => {}} padding="md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-text-primary truncate">{s.client}</p>
                <p className="text-sm text-text-secondary mt-0.5">{s.date} · {s.type}</p>
              </div>
              <Badge variant={STATUS_MAP[s.status].variant}>
                {STATUS_MAP[s.status].label}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* 하단 여백 */}
      <div className="h-4" />
    </div>
  )
}
