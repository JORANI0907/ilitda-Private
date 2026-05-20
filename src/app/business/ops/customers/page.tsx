'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Users, Search, Star, Phone, MapPin, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import type { Client } from '@/types'

// ─── 상수 ────────────────────────────────────────────────────
type StatusFilter = 'all' | 'active' | 'paused' | 'terminated'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',        label: '전체' },
  { key: 'active',     label: '활성' },
  { key: 'paused',     label: '일시중지' },
  { key: 'terminated', label: '해지' },
]

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active:     { label: '활성',     className: 'bg-emerald-100 text-emerald-700' },
  paused:     { label: '일시중지', className: 'bg-amber-100 text-amber-700' },
  terminated: { label: '해지',     className: 'bg-state-danger-bg text-state-danger' },
}

// ─── 클라이언트 카드 ─────────────────────────────────────────
function ClientCard({
  client,
  onClick,
  onFavoriteToggle,
}: {
  client: Client
  onClick: () => void
  onFavoriteToggle: (id: string, val: boolean) => void
}) {
  const statusInfo = client.status ? STATUS_BADGE[client.status] : null
  const unitPriceText = client.unit_price
    ? `${client.unit_price.toLocaleString('ko-KR')}원`
    : null

  async function toggleFav(e: React.MouseEvent) {
    e.stopPropagation()
    const next = !client.is_favorite
    onFavoriteToggle(client.id, next)
    await fetch(`/api/business/customers/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: next }),
    })
  }

  return (
    <Card
      padding="md"
      className="cursor-pointer active:scale-[0.98] transition-transform hover:shadow-card"
      onClick={onClick}
    >
      <div className="flex flex-col gap-2.5">
        {/* 배지 + 즐겨찾기 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {client.type && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-sunken text-text-secondary">
                {client.type}
              </span>
            )}
            {statusInfo && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={toggleFav}
            className="shrink-0 p-1 text-text-tertiary hover:text-amber-400 transition-colors"
          >
            <Star
              size={16}
              className={client.is_favorite ? 'fill-amber-400 text-amber-400' : ''}
            />
          </button>
        </div>

        {/* 이름 */}
        <p className="font-semibold text-text-primary leading-tight">{client.name}</p>

        {/* 정보 */}
        <div className="flex flex-col gap-1 text-sm text-text-secondary">
          {client.phone && (
            <span className="flex items-center gap-1.5">
              <Phone size={13} className="shrink-0 text-text-tertiary" />
              {client.phone}
            </span>
          )}
          {client.address && (
            <span className="flex items-start gap-1.5">
              <MapPin size={13} className="shrink-0 text-text-tertiary mt-0.5" />
              <span className="break-keep line-clamp-1">{client.address}</span>
            </span>
          )}
          {client.next_visit_date && (
            <span className="flex items-center gap-1.5">
              <CalendarDays size={13} className="shrink-0 text-text-tertiary" />
              다음 방문: {client.next_visit_date}
            </span>
          )}
        </div>

        {/* 단가 */}
        {unitPriceText && (
          <p className="text-sm font-medium text-brand-600">{unitPriceText}/회</p>
        )}
      </div>
    </Card>
  )
}

function ClientCardSkeleton() {
  return (
    <Card padding="md">
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-surface-sunken rounded-full animate-pulse" />
          <div className="h-5 w-12 bg-surface-sunken rounded-full animate-pulse" />
        </div>
        <div className="h-5 w-32 bg-surface-sunken rounded animate-pulse" />
        <div className="h-4 w-24 bg-surface-sunken rounded animate-pulse" />
        <div className="h-4 w-40 bg-surface-sunken rounded animate-pulse" />
      </div>
    </Card>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function CustomersPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/business/customers?${params.toString()}`)
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '불러오기에 실패했습니다.')
        return
      }
      setClients(json.data ?? [])
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [query, statusFilter])

  useEffect(() => {
    const t = setTimeout(fetchClients, 300)
    return () => clearTimeout(t)
  }, [fetchClients])

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-24">
      <SectionHeader
        title="고객 관리"
        level="page"
        action={
          <Button size="sm" onClick={() => router.push('/business/ops/customers/new')}>
            <Plus size={16} />
            추가
          </Button>
        }
      />

      {/* 검색 */}
      <Input
        placeholder="고객명으로 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leadingIcon={<Search size={16} />}
      />

      {/* 상태 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`
              shrink-0 h-8 px-4 rounded-full text-sm font-medium transition-colors
              ${statusFilter === tab.key
                ? 'bg-brand-600 text-white'
                : 'bg-surface-sunken text-text-secondary hover:bg-border'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div className="flex flex-col gap-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <ClientCardSkeleton key={i} />
        ))}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-state-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchClients}>재시도</Button>
          </div>
        )}

        {!isLoading && !error && clients.length === 0 && (
          <EmptyState
            icon={<Users size={40} />}
            title="등록된 고객이 없어요"
            description="+ 버튼을 눌러 첫 고객을 등록해 보세요."
            bordered
          />
        )}

        {!isLoading && !error && clients.map((c) => (
          <ClientCard
            key={c.id}
            client={c}
            onClick={() => router.push(`/business/ops/customers/${c.id}`)}
            onFavoriteToggle={(id, val) =>
              setClients((prev) => prev.map((item) => item.id === id ? { ...item, is_favorite: val } : item))
            }
          />
        ))}
      </div>
    </div>
  )
}
