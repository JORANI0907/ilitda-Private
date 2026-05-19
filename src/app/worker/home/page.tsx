'use client'

import { Calendar, Wallet, Star, ChevronRight, MapPin } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'

// 더미 데이터 — Day 5에서 Supabase 쿼리로 교체
const DUMMY_UPCOMING = [
  {
    id: '1',
    client: '스타벅스 판교점',
    date: '5월 20일(화)',
    time: '오후 11:00',
    location: '경기 성남시 분당구',
    type: '주방후드',
    pay: '120,000원',
    status: 'confirmed' as const,
  },
  {
    id: '2',
    client: '이마트 분당점',
    date: '5월 22일(목)',
    time: '오전 02:00',
    location: '경기 성남시 분당구',
    type: '바닥코팅',
    pay: '180,000원',
    status: 'pending' as const,
  },
]

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' }> = {
  confirmed: { label: '확정', variant: 'success' },
  pending:   { label: '대기', variant: 'warning' },
}

export default function WorkerHomePage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary">환영합니다</p>
          <h1 className="text-2xl font-bold text-text-primary leading-tight">홍길동 님 👋</h1>
        </div>
        <div className="flex items-center gap-1 bg-state-warning-bg text-state-warning rounded-full px-3 py-1.5">
          <Star size={14} fill="currentColor" />
          <span className="text-sm font-semibold">4.8</span>
        </div>
      </div>

      {/* 이번 달 요약 */}
      <div className="grid grid-cols-2 gap-3">
        <Card padding="sm" className="text-center">
          <Calendar size={20} className="text-brand-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-text-primary">8건</p>
          <p className="text-xs text-text-secondary mt-0.5">이번 달 일정</p>
        </Card>
        <Card padding="sm" className="text-center">
          <Wallet size={20} className="text-state-success mx-auto mb-1" />
          <p className="text-xl font-bold text-text-primary">960,000원</p>
          <p className="text-xs text-text-secondary mt-0.5">이번 달 예상 정산</p>
        </Card>
      </div>

      {/* 다가오는 일정 */}
      <div className="flex flex-col gap-3">
        <SectionHeader
          title="다가오는 일정"
          action={
            <Button variant="ghost" size="sm" className="text-brand-600 px-0">
              전체보기 <ChevronRight size={14} />
            </Button>
          }
        />
        {DUMMY_UPCOMING.map((item) => (
          <Card key={item.id} onClick={() => {}} padding="md">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="font-semibold text-text-primary truncate">{item.client}</p>
                <p className="text-sm text-text-secondary mt-0.5">{item.type}</p>
              </div>
              <Badge variant={STATUS_MAP[item.status].variant}>
                {STATUS_MAP[item.status].label}
              </Badge>
            </div>
            <div className="flex flex-col gap-1 text-xs text-text-secondary">
              <span className="flex items-center gap-1.5">
                <Calendar size={12} />
                {item.date} {item.time}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={12} />
                {item.location}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
              <span className="text-xs text-text-tertiary">예상 일당</span>
              <span className="text-sm font-bold text-brand-600">{item.pay}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* 새 일감 배너 */}
      <Card padding="md" className="bg-state-success-bg border-state-success/20" onClick={() => {}}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-state-success">새 일감 3건</p>
            <p className="text-xs text-text-secondary mt-0.5">내 지역 근처의 새 일감이 있어요</p>
          </div>
          <ChevronRight size={18} className="text-state-success" />
        </div>
      </Card>

      <div className="h-4" />
    </div>
  )
}
