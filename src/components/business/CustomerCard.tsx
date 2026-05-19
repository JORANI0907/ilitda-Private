'use client'

import { MapPin, Phone, Tag } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Client } from '@/types'

interface CustomerCardProps {
  customer: Client
  onClick?: () => void
}

export function CustomerCard({ customer, onClick }: CustomerCardProps) {
  return (
    <Card onClick={onClick} padding="md">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-text-primary truncate">{customer.name}</span>
          {customer.type && (
            <Badge variant="info">
              <Tag size={10} className="mr-0.5" />
              {customer.type}
            </Badge>
          )}
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
