'use client'

import { useState } from 'react'
import { MapPin, Phone, Tag, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Client } from '@/types'

interface CustomerCardProps {
  customer: Client
  onClick?: () => void
  onFavoriteToggle?: (id: string, newValue: boolean) => void
}

export function CustomerCard({ customer, onClick, onFavoriteToggle }: CustomerCardProps) {
  const [isFav, setIsFav] = useState(customer.is_favorite)
  const [isToggling, setIsToggling] = useState(false)

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isToggling) return
    setIsToggling(true)
    const nextValue = !isFav
    setIsFav(nextValue) // optimistic update
    try {
      const res = await fetch(`/api/business/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: nextValue }),
      })
      const json = await res.json()
      if (!json.success) {
        setIsFav(!nextValue) // rollback
      } else {
        onFavoriteToggle?.(customer.id, nextValue)
      }
    } catch {
      setIsFav(!nextValue) // rollback
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <Card onClick={onClick} padding="md">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-text-primary truncate">{customer.name}</span>
            {customer.type && (
              <Badge variant="info">
                <Tag size={10} className="mr-0.5" />
                {customer.type}
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={handleFavorite}
            disabled={isToggling}
            className="shrink-0 p-1 rounded-full transition-colors hover:bg-surface-sunken disabled:opacity-50"
            aria-label={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <Star
              size={18}
              className={isFav ? 'text-state-warning fill-current' : 'text-text-tertiary'}
            />
          </button>
        </div>
        {customer.phone && (
          <p className="text-sm text-text-secondary flex items-center gap-1.5">
            <Phone size={13} className="shrink-0 text-text-tertiary" />
            {customer.phone}
          </p>
        )}
        {customer.address && (
          <p className="text-sm text-text-secondary flex items-center gap-1.5">
            <MapPin size={13} className="shrink-0 text-text-tertiary" />
            <span className="truncate">{customer.address}</span>
          </p>
        )}
      </div>
    </Card>
  )
}

export function CustomerCardSkeleton() {
  return (
    <Card padding="md">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-28 bg-surface-sunken rounded animate-pulse" />
        <div className="h-3 w-36 bg-surface-sunken rounded animate-pulse" />
        <div className="h-3 w-48 bg-surface-sunken rounded animate-pulse" />
      </div>
    </Card>
  )
}
