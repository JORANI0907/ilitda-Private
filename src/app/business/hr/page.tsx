'use client'

import { useRouter } from 'next/navigation'
import { Users, Package, FileText, FilePen, Lock, Banknote, TrendingUp } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'

interface Card {
  href: string
  icon: React.ReactNode
  color: string
  bg: string
  border: string
  title: string
  desc: string
  comingSoon?: boolean
}

const CARDS: Card[] = [
  {
    href: '/business/hr/workers',
    icon: <Users size={24} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    title: '인사 관리',
    desc: '작업자·출퇴근·급여',
  },
  {
    href: '/business/hr/payroll',
    icon: <Banknote size={24} />,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    title: '급여 관리',
    desc: '작업자 급여·엑셀 다운로드',
  },
  {
    href: '/business/hr/revenue',
    icon: <TrendingUp size={24} />,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    title: '매출 관리',
    desc: '월간·연간 매출·엑셀 다운로드',
  },
  {
    href: '/business/hr/inventory',
    icon: <Package size={24} />,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-100',
    title: '재고 관리',
    desc: '자재·소모품 입출고',
  },
  {
    href: '/business/hr/quotations',
    icon: <FileText size={24} />,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    title: '견적서 관리',
    desc: '견적 작성·발송·이력',
  },
  {
    href: '/business/hr/contracts',
    icon: <FilePen size={24} />,
    color: 'text-amber-400',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    title: '계약서 관리',
    desc: '계약 체결·만료 관리',
    comingSoon: true,
  },
]

export default function HrPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <SectionHeader title="운영" level="page" />

      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((card) =>
          card.comingSoon ? (
            <div
              key={card.href}
              className={`
                relative flex flex-col items-start gap-3 p-4 rounded-2xl
                bg-surface-sunken border-2 border-border-subtle shadow-flat
                text-left opacity-60 cursor-not-allowed select-none
              `}
            >
              <span className={`w-10 h-10 rounded-xl ${card.bg} ${card.color} flex items-center justify-center`}>
                {card.icon}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-secondary">{card.title}</p>
                <p className="text-xs text-text-tertiary mt-0.5 break-keep">{card.desc}</p>
              </div>
              <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-border text-[10px] font-medium text-text-tertiary">
                <Lock size={10} />
                출시 예정
              </span>
            </div>
          ) : (
            <button
              key={card.href}
              type="button"
              onClick={() => router.push(card.href)}
              className={`
                flex flex-col items-start gap-3 p-4 rounded-2xl bg-surface
                border-2 ${card.border} shadow-flat text-left
                hover:border-brand-200 hover:bg-brand-50/30 hover:shadow-card
                active:scale-[0.97] transition-all
              `}
            >
              <span className={`w-10 h-10 rounded-xl ${card.bg} ${card.color} flex items-center justify-center`}>
                {card.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-text-primary">{card.title}</p>
                <p className="text-xs text-text-tertiary mt-0.5 break-keep">{card.desc}</p>
              </div>
            </button>
          )
        )}
      </div>
    </div>
  )
}
