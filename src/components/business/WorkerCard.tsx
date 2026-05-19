'use client'

import { Phone, Star, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { Worker, Profile } from '@/types'

interface WorkerCardProps {
  worker: Worker & { profile?: Pick<Profile, 'name' | 'phone' | 'rating_avg' | 'rating_count'> | null }
  lastWorked?: string | null
  onClick?: () => void
}

export function WorkerCard({ worker, lastWorked, onClick }: WorkerCardProps) {
  const name = worker.profile?.name ?? '이름 없음'
  const phone = worker.profile?.phone ?? null
  const ratingAvg = worker.profile?.rating_avg ?? 0
  const ratingCount = worker.profile?.rating_count ?? 0

  return (
    <Card onClick={onClick} padding="md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="font-semibold text-text-primary">{name}</span>
          {phone && (
            <p className="text-sm text-text-secondary flex items-center gap-1.5">
              <Phone size={13} className="shrink-0 text-text-tertiary" />
              {phone}
            </p>
          )}
          {lastWorked && (
            <p className="text-xs text-text-tertiary flex items-center gap-1">
              <Clock size={11} className="shrink-0" />
              최근 출근: {new Date(lastWorked).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-0.5 text-state-warning">
          <Star size={14} className="fill-current" />
          <span className="text-sm font-medium text-text-primary">
            {ratingAvg > 0 ? ratingAvg.toFixed(1) : '-'}
          </span>
          {ratingCount > 0 && (
            <span className="text-xs text-text-tertiary">({ratingCount})</span>
          )}
        </div>
      </div>
    </Card>
  )
}

export function WorkerCardSkeleton() {
  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-4 w-24 bg-surface-sunken rounded animate-pulse" />
          <div className="h-3 w-32 bg-surface-sunken rounded animate-pulse" />
        </div>
        <div className="h-5 w-16 bg-surface-sunken rounded animate-pulse" />
      </div>
    </Card>
  )
}
