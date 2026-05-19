'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SectionHeader } from '@/components/ui/SectionHeader'

type Segment = 'workers' | 'inventory'

const SEGMENTS: { key: Segment; label: string; path: string }[] = [
  { key: 'workers', label: '인사', path: '/business/hr/workers' },
  { key: 'inventory', label: '재고', path: '/business/hr/inventory' },
]

export default function HrPage() {
  const router = useRouter()
  const [active, setActive] = useState<Segment>('workers')

  function handleSegment(seg: typeof SEGMENTS[number]) {
    setActive(seg.key)
    router.push(seg.path)
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <SectionHeader title="인사재무" level="page" />

      {/* 세그먼트 컨트롤 */}
      <div className="flex rounded-xl bg-surface-sunken p-1 gap-1">
        {SEGMENTS.map((seg) => (
          <button
            key={seg.key}
            type="button"
            onClick={() => handleSegment(seg)}
            className={`
              flex-1 h-9 rounded-lg text-sm font-medium transition-colors
              ${active === seg.key
                ? 'bg-surface text-text-primary shadow-soft'
                : 'text-text-secondary hover:text-text-primary'}
            `}
          >
            {seg.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-text-secondary text-center">
        탭을 선택하면 해당 페이지로 이동합니다.
      </p>
    </div>
  )
}
