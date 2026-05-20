'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Users, Search, Star, Phone, MapPin, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Card } from '@/components/ui/Card'
import { LoginPrompt } from '@/components/shared/LoginPrompt'
import { useRouter } from 'next/navigation'
import type { Client } from '@/types'

// ─── 상수 ────────────────────────────────────────────────────
type StatusFilter = 'all' | 'active' | 'paused' | 'terminated'
type ServiceFilter = 'all' | '1회성케어' | '정기딥케어' | '정기엔드케어'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',        label: '전체' },
  { key: 'active',     label: '활성' },
  { key: 'paused',     label: '일시중지' },
  { key: 'terminated', label: '해지' },
]

const SERVICE_CHIPS: { key: ServiceFilter; label: string }[] = [
  { key: 'all',         label: '전체' },
  { key: '1회성케어',   label: '1회성케어' },
  { key: '정기딥케어',  label: '정기딥케어' },
  { key: '정기엔드케어',label: '정기엔드케어' },
]

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active:     { label: '활성',     className: 'bg-emerald-100 text-emerald-700' },
  paused:     { label: '일시중지', className: 'bg-amber-100 text-amber-700' },
  terminated: { label: '해지',     className: 'bg-state-danger-bg text-state-danger' },
}

const SERVICE_BADGE: Record<string, string> = {
  '1회성케어':    'bg-surface-sunken text-text-secondary',
  '정기딥케어':   'bg-brand-100 text-brand-700',
  '정기엔드케어': 'bg-purple-100 text-purple-700',
}

const SERVICE_TYPES = ['1회성케어', '정기딥케어', '정기엔드케어']

// ─── 추가 폼 ──────────────────────────────────────────────────
interface AddClientForm {
  name: string
  phone: string
  address: string
  service_type: string
  owner_name: string
  email: string
  business_number: string
  notes: string
}

const INITIAL_FORM: AddClientForm = {
  name: '', phone: '', address: '', service_type: '',
  owner_name: '', email: '', business_number: '', notes: '',
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
  const serviceCls = client.service_type ? SERVICE_BADGE[client.service_type] : null
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
        {/* 상단: 배지 + 즐겨찾기 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {serviceCls && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${serviceCls}`}>
                {client.service_type}
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

        {/* 정보 목록 */}
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

// ─── 섹션 레이블 ─────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 mt-1">
      {children}
    </p>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function CustomersPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all')
  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [form, setForm] = useState<AddClientForm>(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (serviceFilter !== 'all') params.set('service_type', serviceFilter)
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
  }, [query, statusFilter, serviceFilter])

  useEffect(() => {
    const t = setTimeout(fetchClients, 300)
    return () => clearTimeout(t)
  }, [fetchClients])

  const setF = (key: keyof AddClientForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))

  async function handleSubmit() {
    setFormError(null)
    if (!form.name.trim()) {
      setFormError('고객명을 입력해 주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(form)) {
        if (v.trim()) payload[k] = v.trim()
      }
      const res = await fetch('/api/business/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) {
        if (res.status === 401) {
          setShowAddModal(false)
          setShowLoginPrompt(true)
          return
        }
        setFormError(json.error ?? '저장에 실패했습니다.')
        return
      }
      setShowAddModal(false)
      setForm(INITIAL_FORM)
      await fetchClients()
      if (json.data?.id) {
        router.push(`/business/ops/customers/${json.data.id}`)
      }
    } catch {
      setFormError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-24">
      <SectionHeader
        title="고객 관리"
        level="page"
        action={
          <Button size="sm" onClick={() => setShowAddModal(true)}>
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

      {/* 서비스 유형 칩 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SERVICE_CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setServiceFilter(chip.key)}
            className={`
              shrink-0 h-7 px-3 rounded-md text-xs font-medium transition-colors border
              ${serviceFilter === chip.key
                ? 'border-brand-600 text-brand-600 bg-brand-50'
                : 'border-border text-text-secondary hover:border-border-strong'}
            `}
          >
            {chip.label}
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

      {/* 고객 추가 모달 */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setFormError(null); setForm(INITIAL_FORM) }}
        title="고객 추가"
        footer={
          <>
            <Button fullWidth onClick={handleSubmit} isLoading={isSubmitting}>저장하기</Button>
            <Button variant="ghost" fullWidth onClick={() => setShowAddModal(false)}>취소</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <SectionLabel>기본 정보</SectionLabel>
          <Input
            label="고객명 *"
            value={form.name}
            placeholder="예: 스타벅스 판교점"
            onChange={setF('name')}
          />
          <Input
            label="전화번호"
            type="tel"
            value={form.phone}
            placeholder="010-0000-0000"
            onChange={setF('phone')}
          />
          <Input
            label="주소"
            value={form.address}
            placeholder="예: 성남시 분당구 판교역로..."
            onChange={setF('address')}
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">서비스 유형</label>
            <select
              value={form.service_type}
              onChange={setF('service_type')}
              className="block w-full h-12 rounded-md bg-surface border border-border text-text-primary px-4 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            >
              <option value="">선택 안 함</option>
              {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <SectionLabel>담당자</SectionLabel>
          <Input
            label="담당자명"
            value={form.owner_name}
            placeholder="예: 홍길동"
            onChange={setF('owner_name')}
          />
          <Input
            label="이메일"
            type="email"
            value={form.email}
            placeholder="example@email.com"
            onChange={setF('email')}
          />
          <Input
            label="사업자번호"
            value={form.business_number}
            placeholder="000-00-00000"
            onChange={setF('business_number')}
          />
          <Input
            label="메모"
            value={form.notes}
            placeholder="추가 메모 (선택)"
            onChange={setF('notes')}
          />

          {formError && (
            <p className="text-sm text-state-danger">{formError}</p>
          )}
        </div>
      </Modal>

      <LoginPrompt
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="고객을 추가하려면 로그인이 필요합니다."
      />
    </div>
  )
}
