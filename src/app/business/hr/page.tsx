'use client'

import { useRouter } from 'next/navigation'
import { Users, Package, FileText, FilePen } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'

const CARDS = [
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
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    title: '계약서 관리',
    desc: '계약 체결·만료 관리',
  },
]

export default function HrPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <SectionHeader title="운영" level="page" />

      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((card) => (
          <button
            key={card.href}
            type="button"
            onClick={() => router.push(card.href)}
            className={`
              flex flex-col items-start gap-3 p-4 rounded-2xl bg-surface
              border-2 ${card.border} shadow-flat text-left
              active:scale-[0.97] transition-transform
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
        ))}
      </div>
    </div>
  )
}
