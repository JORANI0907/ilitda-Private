'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Package, ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { LoginPrompt } from '@/components/shared/LoginPrompt'
import { createClient } from '@/lib/supabase/client'

interface InventoryItem {
  id: string
  name: string
  unit: string | null
  current_quantity: number
  min_quantity: number | null
  business_id: string
}

interface TxForm {
  item_id: string
  type: 'in' | 'out'
  quantity: string
  notes: string
}

const INITIAL_TX: TxForm = { item_id: '', type: 'in', quantity: '', notes: '' }

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showTxModal, setShowTxModal] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('')
  const [newItemMin, setNewItemMin] = useState('')
  const [txForm, setTxForm] = useState<TxForm>(INITIAL_TX)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setItems([])
        setIsLoading(false)
        return
      }

      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (bizError || !business) {
        setError('사업자 정보를 찾을 수 없습니다.')
        setIsLoading(false)
        return
      }

      const { data, error: invError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('business_id', business.id)
        .order('name', { ascending: true })

      if (invError) {
        setError(invError.message)
        return
      }
      setItems(data ?? [])
    } catch {
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  async function handleAddItem() {
    setFormError(null)
    if (!newItemName.trim()) {
      setFormError('재고명을 입력해 주세요.')
      return
    }
    setIsSubmitting(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setShowAddItem(false)
        setShowLoginPrompt(true)
        return
      }

      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (!business) {
        setFormError('사업자 정보를 찾을 수 없습니다.')
        return
      }

      const { error } = await supabase.from('inventory_items').insert({
        business_id: business.id,
        name: newItemName.trim(),
        unit: newItemUnit.trim() || null,
        current_quantity: 0,
        min_quantity: newItemMin ? Number(newItemMin) : null,
      })

      if (error) {
        setFormError(error.message)
        return
      }
      setShowAddItem(false)
      setNewItemName('')
      setNewItemUnit('')
      setNewItemMin('')
      await fetchItems()
    } catch {
      setFormError('오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleTransaction() {
    setFormError(null)
    if (!txForm.item_id || !txForm.quantity) {
      setFormError('항목과 수량을 입력해 주세요.')
      return
    }
    setIsSubmitting(true)
    const supabase = createClient()
    try {
      const qty = Number(txForm.quantity)
      const { error } = await supabase.from('inventory_transactions').insert({
        item_id: txForm.item_id,
        type: txForm.type,
        quantity: qty,
        notes: txForm.notes || null,
      })

      if (error) {
        setFormError(error.message)
        return
      }

      // 수량 업데이트
      const item = items.find((i) => i.id === txForm.item_id)
      if (item) {
        const newQty = txForm.type === 'in'
          ? item.current_quantity + qty
          : Math.max(0, item.current_quantity - qty)
        await supabase
          .from('inventory_items')
          .update({ current_quantity: newQty })
          .eq('id', txForm.item_id)
      }

      setShowTxModal(false)
      setTxForm(INITIAL_TX)
      await fetchItems()
    } catch {
      setFormError('오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <SectionHeader
        title="재고 관리"
        level="page"
        action={
          <Button size="sm" onClick={() => setShowAddItem(true)}>
            <Plus size={16} />
            항목 추가
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} padding="md">
            <div className="flex flex-col gap-2">
              <div className="h-4 w-28 bg-surface-sunken rounded animate-pulse" />
              <div className="h-3 w-20 bg-surface-sunken rounded animate-pulse" />
            </div>
          </Card>
        ))}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-state-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchItems}>재시도</Button>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <EmptyState
            icon={<Package size={40} />}
            title="등록된 재고가 없어요"
            description="항목 추가 버튼을 눌러 재고를 등록하세요."
            bordered
          />
        )}

        {!isLoading && !error && items.map((item) => {
          const isLow = item.min_quantity !== null && item.current_quantity <= item.min_quantity
          return (
            <Card key={item.id} padding="md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-semibold text-text-primary">{item.name}</span>
                  {item.min_quantity !== null && (
                    <span className="text-xs text-text-tertiary">최소: {item.min_quantity}{item.unit ?? ''}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className={`text-lg font-bold ${isLow ? 'text-state-danger' : 'text-text-primary'}`}>
                    {item.current_quantity}
                    <span className="text-sm font-normal text-text-tertiary ml-0.5">{item.unit ?? ''}</span>
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => { setTxForm({ ...INITIAL_TX, item_id: item.id, type: 'in' }); setShowTxModal(true) }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-state-success-bg text-state-success hover:opacity-80"
                      aria-label="입고"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTxForm({ ...INITIAL_TX, item_id: item.id, type: 'out' }); setShowTxModal(true) }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-state-danger-bg text-state-danger hover:opacity-80"
                      aria-label="출고"
                    >
                      <ArrowUp size={14} />
                    </button>
                  </div>
                </div>
              </div>
              {isLow && (
                <p className="mt-2 text-xs text-state-danger font-medium">수량 부족 — 재입고가 필요합니다.</p>
              )}
            </Card>
          )
        })}
      </div>

      {/* 항목 추가 모달 */}
      <Modal
        open={showAddItem}
        onClose={() => { setShowAddItem(false); setFormError(null) }}
        title="재고 항목 추가"
        footer={
          <>
            <Button fullWidth onClick={handleAddItem} isLoading={isSubmitting}>저장하기</Button>
            <Button variant="ghost" fullWidth onClick={() => setShowAddItem(false)}>취소</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="재고명 *" value={newItemName} placeholder="예: 청소용 세제" onChange={(e) => setNewItemName(e.target.value)} />
          <Input label="단위" value={newItemUnit} placeholder="예: L, 개, 박스" onChange={(e) => setNewItemUnit(e.target.value)} />
          <Input label="최소 수량" type="number" value={newItemMin} placeholder="부족 알림 기준" onChange={(e) => setNewItemMin(e.target.value)} />
          {formError && <p className="text-sm text-state-danger">{formError}</p>}
        </div>
      </Modal>

      {/* 입출고 모달 */}
      <Modal
        open={showTxModal}
        onClose={() => { setShowTxModal(false); setFormError(null) }}
        title={txForm.type === 'in' ? '입고 처리' : '출고 처리'}
        footer={
          <>
            <Button fullWidth onClick={handleTransaction} isLoading={isSubmitting}>확인</Button>
            <Button variant="ghost" fullWidth onClick={() => setShowTxModal(false)}>취소</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="수량 *"
            type="number"
            value={txForm.quantity}
            placeholder="수량 입력"
            onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })}
          />
          <Input
            label="메모"
            value={txForm.notes}
            placeholder="메모 (선택)"
            onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
          />
          {formError && <p className="text-sm text-state-danger">{formError}</p>}
        </div>
      </Modal>

      <LoginPrompt
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />
    </div>
  )
}
