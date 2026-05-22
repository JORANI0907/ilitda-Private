'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Package, ChevronDown, ChevronUp, Pencil, Trash2, Settings, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'
import { usePlanType } from '@/hooks/usePlanType'
import { canUseFeature } from '@/lib/plan-features'

interface Category {
  id: string
  name: string
  sort_order: number
}

interface InventoryItem {
  id: string
  name: string
  unit: string | null
  current_qty: number
  min_qty: number | null
  category: string
}

interface TxLog {
  id: string
  type: 'in' | 'out' | 'adjust'
  qty: number
  note: string | null
  created_at: string
}

type TxType = 'in' | 'out' | 'adjust'


const TX_LABEL: Record<TxType, string> = { in: '입고', out: '출고', adjust: '조정' }
const TX_SIGN: Record<TxType, string> = { in: '+', out: '−', adjust: '=' }
const TX_COLOR: Record<TxType, string> = {
  in: 'text-state-success',
  out: 'text-state-danger',
  adjust: 'text-text-secondary',
}
const TX_DESC: Record<TxType, string> = {
  in: '창고 입고 — 재고가 증가합니다.',
  out: '출고/사용 — 재고가 감소합니다.',
  adjust: '재고 조정 — 입력값이 새 재고량이 됩니다.',
}

const SELECT_CLASS =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-600'

const EMPTY_ITEM = { name: '', unit: '', min_qty: '', category: '' }
const EMPTY_TX = { qty: '', note: '' }

const HELP_SECTIONS = [
  {
    title: '카테고리 및 품목 추가 방법',
    content: '상단 "카테고리" 버튼으로 카테고리를 먼저 만들고, "항목 추가" 버튼으로 재고 품목을 등록하세요. 카테고리별로 품목을 구분해 관리할 수 있습니다.',
  },
  {
    title: '입고 / 출고 / 조정 거래 기록',
    content: '각 품목 카드의 입고·출고·조정 버튼을 탭해 수량 변동을 기록하세요.\n입고: 재고가 늘어납니다.\n출고: 재고가 줄어듭니다.\n조정: 실제 수량으로 직접 맞춥니다.',
  },
  {
    title: '검색 및 CSV 내보내기',
    content: '상단 검색창에서 품목명으로 빠르게 찾을 수 있습니다. "CSV" 버튼을 누르면 전체 재고 현황을 엑셀에서 열 수 있는 파일로 내려받습니다.',
  },
]

export default function InventoryPage() {
  const { planType, isLoading: planLoading } = usePlanType()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('all')
  const [showLowOnly, setShowLowOnly] = useState(false)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [logs, setLogs] = useState<Record<string, TxLog[]>>({})
  const [loadingLogs, setLoadingLogs] = useState<Set<string>>(new Set())

  // 항목 추가
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_ITEM)
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  // 항목 수정
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_ITEM)
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  // 트랜잭션
  const [txTarget, setTxTarget] = useState<InventoryItem | null>(null)
  const [txType, setTxType] = useState<TxType>('in')
  const [txForm, setTxForm] = useState(EMPTY_TX)
  const [txError, setTxError] = useState<string | null>(null)
  const [txLoading, setTxLoading] = useState(false)

  // 삭제
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 카테고리 관리
  const [showCatMgmt, setShowCatMgmt] = useState(false)
  const [editingCat, setEditingCat] = useState<{ id: string; name: string } | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [showAddCat, setShowAddCat] = useState(false)
  const [catError, setCatError] = useState<string | null>(null)
  const [catLoading, setCatLoading] = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/business/inventory-categories')
    const json = await res.json()
    if (json.success) setCategories(json.data)
  }, [])

  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/business/inventory')
      const json = await res.json()
      if (!json.success) { setError(json.error ?? '데이터를 불러오지 못했습니다.'); return }
      setItems(json.data ?? [])
    } catch {
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchItems()
  }, [fetchCategories, fetchItems])

  // 항목 추가 시 첫 카테고리를 기본값으로
  useEffect(() => {
    if (showAdd && categories.length > 0 && !addForm.category) {
      setAddForm((f) => ({ ...f, category: categories[0].name }))
    }
  }, [showAdd, categories, addForm.category])

const filteredItems = useMemo(() => items.filter((item) => {
    if (filterCat !== 'all' && item.category !== filterCat) return false
    if (showLowOnly && (item.min_qty === null || item.current_qty > item.min_qty)) return false
    if (search.trim() && !item.name.toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  }), [items, filterCat, showLowOnly, search])

  async function fetchLogs(itemId: string) {
    if (logs[itemId] || loadingLogs.has(itemId)) return
    setLoadingLogs((prev) => new Set(prev).add(itemId))
    try {
      const res = await fetch(`/api/business/inventory/${itemId}/transactions`)
      const json = await res.json()
      if (json.success) setLogs((prev) => ({ ...prev, [itemId]: json.data }))
    } finally {
      setLoadingLogs((prev) => { const s = new Set(prev); s.delete(itemId); return s })
    }
  }

  function handleToggleExpand(item: InventoryItem) {
    if (expandedId === item.id) { setExpandedId(null); return }
    setExpandedId(item.id)
    fetchLogs(item.id)
  }

  function openTx(item: InventoryItem, type: TxType) {
    setTxTarget(item); setTxType(type); setTxForm(EMPTY_TX); setTxError(null)
  }

  function openEdit(item: InventoryItem) {
    setEditTarget(item)
    setEditForm({ name: item.name, unit: item.unit ?? '', min_qty: item.min_qty !== null ? String(item.min_qty) : '', category: item.category })
    setEditError(null)
  }

  async function handleAddItem() {
    setAddError(null)
    if (!addForm.name.trim()) { setAddError('재고명을 입력해 주세요.'); return }
    setAddLoading(true)
    try {
      const res = await fetch('/api/business/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addForm.name.trim(), unit: addForm.unit.trim() || null, min_qty: addForm.min_qty ? Number(addForm.min_qty) : null, category: addForm.category }),
      })
      const json = await res.json()
      if (!json.success) { setAddError(json.error ?? '오류가 발생했습니다.'); return }
      setShowAdd(false); setAddForm(EMPTY_ITEM); await fetchItems()
    } catch { setAddError('오류가 발생했습니다.') } finally { setAddLoading(false) }
  }

  async function handleEditItem() {
    if (!editTarget) return
    setEditError(null)
    if (!editForm.name.trim()) { setEditError('재고명을 입력해 주세요.'); return }
    setEditLoading(true)
    try {
      const res = await fetch(`/api/business/inventory/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name.trim(), unit: editForm.unit.trim() || null, min_qty: editForm.min_qty ? Number(editForm.min_qty) : null, category: editForm.category }),
      })
      const json = await res.json()
      if (!json.success) { setEditError(json.error ?? '오류가 발생했습니다.'); return }
      setEditTarget(null); await fetchItems()
    } catch { setEditError('오류가 발생했습니다.') } finally { setEditLoading(false) }
  }

  async function handleTransaction() {
    if (!txTarget) return
    setTxError(null)
    const qty = Number(txForm.qty)
    if (!txForm.qty || isNaN(qty) || qty < 0) { setTxError('수량을 올바르게 입력해 주세요.'); return }
    setTxLoading(true)
    try {
      const res = await fetch('/api/business/inventory-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_id: txTarget.id, type: txType, qty, note: txForm.note.trim() || null }),
      })
      const json = await res.json()
      if (!json.success) { setTxError(json.error ?? '오류가 발생했습니다.'); return }
      setLogs((prev) => { const n = { ...prev }; delete n[txTarget.id]; return n })
      setTxTarget(null); await fetchItems()
    } catch { setTxError('오류가 발생했습니다.') } finally { setTxLoading(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/business/inventory/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) { alert(json.error ?? '삭제에 실패했습니다.'); return }
      setDeleteTarget(null)
      if (expandedId === deleteTarget.id) setExpandedId(null)
      await fetchItems()
    } catch { alert('삭제 중 오류가 발생했습니다.') } finally { setDeleteLoading(false) }
  }

  // ── 카테고리 관리 ──────────────────────────────
  async function handleAddCategory() {
    setCatError(null)
    if (!newCatName.trim()) { setCatError('카테고리 이름을 입력해 주세요.'); return }
    setCatLoading(true)
    try {
      const res = await fetch('/api/business/inventory-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() }),
      })
      const json = await res.json()
      if (!json.success) { setCatError(json.error ?? '오류가 발생했습니다.'); return }
      setNewCatName(''); setShowAddCat(false); await fetchCategories()
    } catch { setCatError('오류가 발생했습니다.') } finally { setCatLoading(false) }
  }

  async function handleRenameCategory() {
    if (!editingCat) return
    setCatError(null)
    if (!editingCat.name.trim()) { setCatError('카테고리 이름을 입력해 주세요.'); return }
    setCatLoading(true)
    try {
      const res = await fetch(`/api/business/inventory-categories/${editingCat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCat.name.trim() }),
      })
      const json = await res.json()
      if (!json.success) { setCatError(json.error ?? '오류가 발생했습니다.'); return }
      setEditingCat(null); await Promise.all([fetchCategories(), fetchItems()])
    } catch { setCatError('오류가 발생했습니다.') } finally { setCatLoading(false) }
  }

  async function handleDeleteCategory(cat: Category) {
    if (!window.confirm(`"${cat.name}" 카테고리를 삭제하면 해당 항목들이 첫 번째 남은 카테고리로 이동합니다. 계속할까요?`)) return
    const fallback = categories.find((c) => c.id !== cat.id)?.name ?? '기타'
    setDeletingCatId(cat.id)
    try {
      const res = await fetch(`/api/business/inventory-categories/${cat.id}?fallback=${encodeURIComponent(fallback)}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) { alert(json.error ?? '삭제에 실패했습니다.'); return }
      if (filterCat === cat.name) setFilterCat('all')
      await Promise.all([fetchCategories(), fetchItems()])
    } catch { alert('삭제 중 오류가 발생했습니다.') } finally { setDeletingCatId(null) }
  }

  function handleExportCSV() {
    const header = '이름,카테고리,현재수량,단위,최소수량\n'
    const rows = items.map((i) => `${i.name},${i.category},${i.current_qty},${i.unit ?? ''},${i.min_qty ?? ''}`).join('\n')
    const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `재고현황_${new Date().toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const lowCount = items.filter((i) => i.min_qty !== null && i.current_qty <= i.min_qty).length
  const defaultCat = categories[0]?.name ?? ''

  if (!planLoading && !canUseFeature(planType, 'inventory')) {
    return (
      <div className="flex flex-col gap-5 px-4 pt-6 pb-24">
        <SectionHeader title="재고 관리" level="page" />
        <UpgradeModal
          open={true}
          onClose={() => setUpgradeOpen(false)}
          featureName="재고 관리"
          requiredPlan="pro"
          currentPlan={planType}
        />
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <p className="text-sm text-text-secondary break-keep">프로 이상 플랜에서 이용할 수 있습니다.</p>
          <Button variant="secondary" size="sm" onClick={() => setUpgradeOpen(true)}>플랜 업그레이드 안내</Button>
        </div>
        {upgradeOpen && (
          <UpgradeModal
            open={upgradeOpen}
            onClose={() => setUpgradeOpen(false)}
            featureName="재고 관리"
            requiredPlan="pro"
            currentPlan={planType}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-24">
      <SectionHeader
        title="재고 관리"
        level="page"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleExportCSV}>CSV</Button>
            <Button size="sm" variant="secondary" onClick={() => { setShowCatMgmt(true); setCatError(null); setEditingCat(null); setShowAddCat(false) }}>
              <Settings size={15} />
              카테고리
            </Button>
            <Button size="sm" onClick={() => { setShowAdd(true); setAddForm({ ...EMPTY_ITEM, category: defaultCat }); setAddError(null) }}>
              <Plus size={16} />
              항목 추가
            </Button>
          </div>
        }
      />

      <HelpBanner label="재고 관리 사용법 보기" onClick={() => setHelpOpen(true)} />
      <HelpTip>품목을 탭하면 거래 내역을 확인하고 새 거래를 추가할 수 있습니다.</HelpTip>
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="재고 관리 사용법"
        sections={HELP_SECTIONS}
      />

      <Input placeholder="재고명 검색…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {/* 카테고리 필터 탭 */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => setFilterCat('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterCat === 'all' ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-text-secondary hover:bg-border-subtle'}`}
        >
          전체
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setFilterCat(cat.name)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterCat === cat.name ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-text-secondary hover:bg-border-subtle'}`}
          >
            {cat.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowLowOnly(!showLowOnly)}
          className={`ml-auto px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${showLowOnly ? 'bg-state-danger-bg text-state-danger' : 'bg-surface-sunken text-text-secondary hover:bg-border-subtle'}`}
        >
          부족{lowCount > 0 && <span className="font-bold ml-1">{lowCount}</span>}
        </button>
      </div>

      {/* 아이템 목록 */}
      {isLoading && Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} padding="md">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 bg-surface-sunken rounded animate-pulse" />
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

      {!isLoading && !error && filteredItems.length === 0 && (
        <EmptyState
          icon={<Package size={40} />}
          title={search || filterCat !== 'all' || showLowOnly ? '조건에 맞는 재고가 없어요' : '등록된 재고가 없어요'}
          description={search || filterCat !== 'all' || showLowOnly ? '검색 조건을 변경해 보세요.' : '항목 추가 버튼을 눌러 재고를 등록하세요.'}
          bordered
        />
      )}

      {!isLoading && !error && filteredItems.map((item) => {
        const isLow = item.min_qty !== null && item.current_qty <= item.min_qty
        const isExpanded = expandedId === item.id
        const itemLogs = logs[item.id]
        const isLoadingLog = loadingLogs.has(item.id)

        return (
          <Card key={item.id} padding="md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="inline-flex items-center self-start px-2 py-0.5 rounded-full text-xs font-medium text-text-tertiary bg-surface-sunken">
                  {item.category}
                </span>
                <span className="font-semibold text-text-primary break-keep">{item.name}</span>
                {item.min_qty !== null && (
                  <span className="text-xs text-text-tertiary">최소 기준: {item.min_qty}{item.unit ?? ''}</span>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <p className={`text-xl font-bold ${isLow ? 'text-state-danger' : 'text-text-primary'}`}>
                  {item.current_qty}
                  <span className="text-sm font-normal text-text-tertiary ml-0.5">{item.unit ?? ''}</span>
                </p>
                {isLow && <span className="text-xs text-state-danger font-medium">수량 부족</span>}
              </div>
            </div>

            <div className="flex gap-2 mt-3 flex-wrap">
              <button type="button" onClick={() => openTx(item, 'in')} className="flex-1 min-w-0 py-1.5 text-xs font-medium rounded-lg border border-border bg-state-success-bg text-state-success hover:opacity-80 transition-opacity">입고</button>
              <button type="button" onClick={() => openTx(item, 'out')} className="flex-1 min-w-0 py-1.5 text-xs font-medium rounded-lg border border-border bg-state-danger-bg text-state-danger hover:opacity-80 transition-opacity">출고</button>
              <button type="button" onClick={() => openTx(item, 'adjust')} className="flex-1 min-w-0 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface-sunken text-text-secondary hover:opacity-80 transition-opacity">조정</button>
              <button type="button" onClick={() => openEdit(item)} className="w-8 h-7 flex items-center justify-center rounded-lg border border-border bg-surface-sunken text-text-secondary hover:opacity-80 transition-opacity" aria-label="수정"><Pencil size={13} /></button>
              <button type="button" onClick={() => setDeleteTarget(item)} className="w-8 h-7 flex items-center justify-center rounded-lg border border-border bg-surface-sunken text-text-tertiary hover:bg-state-danger-bg hover:text-state-danger transition-colors" aria-label="삭제"><Trash2 size={13} /></button>
              <button type="button" onClick={() => handleToggleExpand(item)} className="w-8 h-7 flex items-center justify-center rounded-lg border border-border bg-surface-sunken text-text-secondary hover:opacity-80 transition-opacity" aria-label="내역">
                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-border-subtle">
                <p className="text-xs font-semibold text-text-secondary mb-2">변동 내역 (최근 50건)</p>
                {isLoadingLog && Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-3 w-full bg-surface-sunken rounded animate-pulse mb-2" />
                ))}
                {!isLoadingLog && itemLogs?.length === 0 && <p className="text-xs text-text-tertiary">변동 내역이 없습니다.</p>}
                {!isLoadingLog && itemLogs && itemLogs.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {itemLogs.map((log) => (
                      <div key={log.id} className="flex items-start justify-between gap-2 text-xs">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className={`font-medium ${TX_COLOR[log.type]}`}>{TX_LABEL[log.type]}</span>
                          {log.note && <span className="text-text-tertiary truncate">{log.note}</span>}
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className={`font-semibold ${TX_COLOR[log.type]}`}>{TX_SIGN[log.type]}{log.qty}{item.unit ?? ''}</span>
                          <span className="text-text-tertiary">{new Date(log.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}

      {/* ── 카테고리 관리 모달 ─────────────────────────── */}
      <Modal
        open={showCatMgmt}
        onClose={() => setShowCatMgmt(false)}
        title="카테고리 관리"
        footer={<Button fullWidth variant="ghost" onClick={() => setShowCatMgmt(false)}>닫기</Button>}
      >
        <div className="flex flex-col gap-3">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2">
              {editingCat?.id === cat.id ? (
                <>
                  <input
                    value={editingCat.name}
                    onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCategory(); if (e.key === 'Escape') setEditingCat(null) }}
                    className="flex-1 rounded-md border border-brand-600 bg-surface px-2 py-1 text-sm text-text-primary focus:outline-none"
                    autoFocus
                  />
                  <button type="button" onClick={handleRenameCategory} disabled={catLoading} className="w-7 h-7 flex items-center justify-center rounded-md bg-state-success-bg text-state-success hover:opacity-80"><Check size={14} /></button>
                  <button type="button" onClick={() => { setEditingCat(null); setCatError(null) }} className="w-7 h-7 flex items-center justify-center rounded-md bg-surface-sunken text-text-tertiary hover:opacity-80"><X size={14} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-text-primary">{cat.name}</span>
                  <button type="button" onClick={() => { setEditingCat({ id: cat.id, name: cat.name }); setCatError(null) }} className="w-7 h-7 flex items-center justify-center rounded-md bg-surface-sunken text-text-secondary hover:opacity-80"><Pencil size={13} /></button>
                  <button type="button" onClick={() => handleDeleteCategory(cat)} disabled={deletingCatId === cat.id || categories.length <= 1} className="w-7 h-7 flex items-center justify-center rounded-md bg-surface-sunken text-text-tertiary hover:bg-state-danger-bg hover:text-state-danger transition-colors disabled:opacity-30"><Trash2 size={13} /></button>
                </>
              )}
            </div>
          ))}

          {/* 새 카테고리 추가 인라인 */}
          {showAddCat ? (
            <div className="flex items-center gap-2 pt-1 border-t border-border-subtle">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') { setShowAddCat(false); setNewCatName('') } }}
                placeholder="새 카테고리 이름"
                className="flex-1 rounded-md border border-brand-600 bg-surface px-2 py-1 text-sm text-text-primary focus:outline-none"
                autoFocus
              />
              <button type="button" onClick={handleAddCategory} disabled={catLoading} className="w-7 h-7 flex items-center justify-center rounded-md bg-state-success-bg text-state-success hover:opacity-80"><Check size={14} /></button>
              <button type="button" onClick={() => { setShowAddCat(false); setNewCatName(''); setCatError(null) }} className="w-7 h-7 flex items-center justify-center rounded-md bg-surface-sunken text-text-tertiary hover:opacity-80"><X size={14} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => { setShowAddCat(true); setCatError(null) }} className="flex items-center gap-2 text-sm text-brand-600 hover:opacity-80 pt-1 border-t border-border-subtle">
              <Plus size={15} />카테고리 추가
            </button>
          )}

          {catError && <p className="text-sm text-state-danger">{catError}</p>}
        </div>
      </Modal>

      {/* ── 항목 추가 모달 ─────────────────────────── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setAddError(null) }} title="재고 항목 추가"
        footer={<><Button fullWidth onClick={handleAddItem} isLoading={addLoading}>저장하기</Button><Button variant="ghost" fullWidth onClick={() => setShowAdd(false)}>취소</Button></>}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">카테고리</label>
            <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className={SELECT_CLASS}>
              {categories.map((cat) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
          </div>
          <Input label="재고명 *" value={addForm.name} placeholder="예: 청소용 세제" onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
          <Input label="단위" value={addForm.unit} placeholder="예: L, 개, 박스" onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })} />
          <Input label="최소 수량" type="number" value={addForm.min_qty} placeholder="부족 알림 기준" onChange={(e) => setAddForm({ ...addForm, min_qty: e.target.value })} />
          {addError && <p className="text-sm text-state-danger">{addError}</p>}
        </div>
      </Modal>

      {/* ── 항목 수정 모달 ─────────────────────────── */}
      <Modal open={editTarget !== null} onClose={() => { setEditTarget(null); setEditError(null) }} title="재고 항목 수정"
        footer={<><Button fullWidth onClick={handleEditItem} isLoading={editLoading}>저장하기</Button><Button variant="ghost" fullWidth onClick={() => setEditTarget(null)}>취소</Button></>}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">카테고리</label>
            <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className={SELECT_CLASS}>
              {categories.map((cat) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
          </div>
          <Input label="재고명 *" value={editForm.name} placeholder="재고명" onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="단위" value={editForm.unit} placeholder="예: L, 개, 박스" onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} />
          <Input label="최소 수량" type="number" value={editForm.min_qty} placeholder="부족 알림 기준" onChange={(e) => setEditForm({ ...editForm, min_qty: e.target.value })} />
          {editError && <p className="text-sm text-state-danger">{editError}</p>}
        </div>
      </Modal>

      {/* ── 입출고/조정 모달 ─────────────────────────── */}
      <Modal open={txTarget !== null} onClose={() => { setTxTarget(null); setTxError(null) }} title={txTarget ? `${txTarget.name} — ${TX_LABEL[txType]}` : ''}
        footer={<><Button fullWidth onClick={handleTransaction} isLoading={txLoading}>확인</Button><Button variant="ghost" fullWidth onClick={() => setTxTarget(null)}>취소</Button></>}
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {(['in', 'out', 'adjust'] as TxType[]).map((t) => (
              <button key={t} type="button" onClick={() => setTxType(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${txType === t ? t === 'in' ? 'bg-state-success-bg text-state-success border-state-success' : t === 'out' ? 'bg-state-danger-bg text-state-danger border-state-danger' : 'bg-surface-sunken text-text-primary border-border-strong' : 'bg-surface text-text-secondary border-border'}`}
              >
                {TX_LABEL[t]}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-tertiary -mt-2">{TX_DESC[txType]}</p>
          <Input label={txType === 'adjust' ? '새 재고량 *' : '수량 *'} type="number" value={txForm.qty} placeholder={txType === 'adjust' ? '새 수량 입력' : '수량 입력'} onChange={(e) => setTxForm({ ...txForm, qty: e.target.value })} />
          <Input label="메모" value={txForm.note} placeholder="메모 (선택)" onChange={(e) => setTxForm({ ...txForm, note: e.target.value })} />
          {txError && <p className="text-sm text-state-danger">{txError}</p>}
        </div>
      </Modal>

      {/* ── 삭제 확인 모달 ─────────────────────────── */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="항목 삭제"
        footer={<><Button fullWidth variant="danger" onClick={handleDelete} isLoading={deleteLoading}>삭제하기</Button><Button variant="ghost" fullWidth onClick={() => setDeleteTarget(null)}>취소</Button></>}
      >
        <p className="text-sm text-text-primary">
          <span className="font-semibold">{deleteTarget?.name}</span> 항목과 모든 변동 내역을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
      </Modal>
    </div>
  )
}
