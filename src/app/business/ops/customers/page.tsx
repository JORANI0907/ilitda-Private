'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Users, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { LoginPrompt } from '@/components/shared/LoginPrompt'
import { CustomerCard, CustomerCardSkeleton } from '@/components/business/CustomerCard'
import { useRouter } from 'next/navigation'
import type { Client } from '@/types'

interface AddCustomerForm {
  name: string
  phone: string
  address: string
  type: string
  notes: string
}

const INITIAL_FORM: AddCustomerForm = {
  name: '',
  phone: '',
  address: '',
  type: '',
  notes: '',
}

export default function CustomersPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [customers, setCustomers] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [form, setForm] = useState<AddCustomerForm>(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      const res = await fetch(`/api/business/customers?${params.toString()}`)
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '불러오기에 실패했습니다.')
        return
      }
      setCustomers(json.data ?? [])
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [query])

  useEffect(() => {
    const t = setTimeout(fetchCustomers, 300)
    return () => clearTimeout(t)
  }, [fetchCustomers])

  async function handleSubmit() {
    setFormError(null)
    if (!form.name.trim()) {
      setFormError('고객명을 입력해 주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/business/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
      await fetchCustomers()
    } catch {
      setFormError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <SectionHeader
        title="고객"
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

      {/* 목록 */}
      <div className="flex flex-col gap-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <CustomerCardSkeleton key={i} />
        ))}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-state-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchCustomers}>재시도</Button>
          </div>
        )}

        {!isLoading && !error && customers.length === 0 && (
          <EmptyState
            icon={<Users size={40} />}
            title="등록된 고객이 없어요"
            description="+ 버튼을 눌러 첫 고객을 등록해 보세요."
            bordered
          />
        )}

        {!isLoading && !error && customers.map((c) => (
          <CustomerCard
            key={c.id}
            customer={c}
            onClick={() => router.push(`/business/ops/customers/${c.id}`)}
          />
        ))}
      </div>

      {/* 고객 추가 모달 */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setFormError(null) }}
        title="고객 추가"
        footer={
          <>
            <Button fullWidth onClick={handleSubmit} isLoading={isSubmitting}>저장하기</Button>
            <Button variant="ghost" fullWidth onClick={() => setShowAddModal(false)}>취소</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="고객명 *"
            value={form.name}
            placeholder="예: 스타벅스 판교점"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="전화번호"
            type="tel"
            value={form.phone}
            placeholder="예: 010-1234-5678"
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="주소"
            value={form.address}
            placeholder="예: 성남시 분당구..."
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Input
            label="유형"
            value={form.type}
            placeholder="예: 카페, 식당, 마트"
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />
          <Input
            label="메모"
            value={form.notes}
            placeholder="추가 메모 (선택)"
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
