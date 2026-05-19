'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, UserPlus, Phone, Link2, Trash2, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Connection } from '@/types'

type AddMode = 'manual' | 'invite'

function StatusBadge({ connection }: { connection: Connection }) {
  if (connection.is_manual) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-sunken text-text-secondary">
        수동
      </span>
    )
  }
  if (connection.status === 'pending') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        초대 대기
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      앱 연결됨
    </span>
  )
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

export default function WorkersPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>('manual')
  const [addName, setAddName] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchConnections = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/business/hr/connections')
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '불러오기에 실패했습니다.')
        return
      }
      setConnections(json.data ?? [])
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const handleAdd = async () => {
    if (!addName.trim()) {
      setAddError('이름을 입력해 주세요.')
      return
    }
    setIsAdding(true)
    setAddError(null)
    try {
      const res = await fetch('/api/business/hr/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: addName.trim(),
          phone: addPhone.trim() || null,
          is_manual: addMode === 'manual',
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setAddError(json.error ?? '추가에 실패했습니다.')
        return
      }

      if (addMode === 'invite' && json.data?.invite_token) {
        const link = `${window.location.origin}/connect/${json.data.invite_token}`
        try {
          await navigator.clipboard.writeText(link)
        } catch {
          // clipboard write failed silently
        }
      }

      setConnections((prev) => [json.data, ...prev])
      resetAddModal()
    } catch {
      setAddError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsAdding(false)
    }
  }

  const resetAddModal = () => {
    setShowAddModal(false)
    setAddName('')
    setAddPhone('')
    setAddMode('manual')
    setAddError(null)
  }

  const handleCopyLink = async (connection: Connection) => {
    const link = `${window.location.origin}/connect/${connection.invite_token}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(connection.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // fallback: alert
      alert(`초대 링크: ${link}`)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/business/hr/connections/${id}`, { method: 'DELETE' })
      setConnections((prev) => prev.filter((c) => c.id !== id))
    } catch {
      // silent fail — refresh will fix state
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-24">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="직원 관리"
          level="page"
          description="함께 일하는 직원을 관리합니다"
        />
        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="shrink-0"
        >
          <UserPlus size={15} className="mr-1.5" />
          직원 추가
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-surface rounded-2xl animate-pulse" />
        ))}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-state-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchConnections}>재시도</Button>
          </div>
        )}

        {!isLoading && !error && connections.length === 0 && (
          <EmptyState
            icon={<Users size={40} />}
            title="등록된 직원이 없어요"
            description="직원을 수동으로 추가하거나 초대 링크를 공유하세요."
            bordered
          />
        )}

        {!isLoading && !error && connections.map((conn) => (
          <div
            key={conn.id}
            className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-surface-sunken flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-text-secondary">
                {conn.display_name.charAt(0)}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-text-primary text-sm">{conn.display_name}</span>
                <StatusBadge connection={conn} />
              </div>
              {conn.manual_phone && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Phone size={11} className="text-text-tertiary shrink-0" />
                  <span className="text-xs text-text-secondary">{conn.manual_phone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {!conn.is_manual && conn.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => handleCopyLink(conn)}
                  className="p-2 rounded-lg text-text-secondary hover:bg-surface-sunken transition-colors"
                  aria-label="초대 링크 복사"
                  title="초대 링크 복사"
                >
                  {copiedId === conn.id ? (
                    <Check size={16} className="text-state-success" />
                  ) : (
                    <Link2 size={16} />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(conn.id)}
                disabled={deletingId === conn.id}
                className="p-2 rounded-lg text-text-tertiary hover:bg-red-50 hover:text-state-danger transition-colors disabled:opacity-50"
                aria-label="삭제"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 직원 추가 모달 */}
      <Modal
        open={showAddModal}
        onClose={resetAddModal}
        title="직원 추가"
        footer={
          <Button
            fullWidth
            onClick={handleAdd}
            isLoading={isAdding}
          >
            {addMode === 'manual' ? '추가하기' : '링크 생성 및 복사'}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {/* 모드 탭 */}
          <div className="flex rounded-xl bg-surface-sunken p-1 gap-1">
            {(['manual', 'invite'] as AddMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setAddMode(mode); setAddError(null) }}
                className={`
                  flex-1 h-9 rounded-lg text-sm font-medium transition-colors
                  ${addMode === mode
                    ? 'bg-surface text-text-primary shadow-soft'
                    : 'text-text-secondary hover:text-text-primary'}
                `}
              >
                {mode === 'manual' ? '수동 추가' : '링크 초대'}
              </button>
            ))}
          </div>

          {addMode === 'invite' && (
            <p className="text-xs text-text-secondary bg-surface-sunken rounded-xl p-3 break-keep">
              생성된 초대 링크를 직원에게 공유하세요. 직원이 링크를 통해 앱에 로그인하면 자동으로 연결됩니다.
            </p>
          )}

          <Input
            label="이름 *"
            placeholder={addMode === 'manual' ? '예: 홍길동' : '직원 이름'}
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
          />

          <Input
            label="전화번호"
            type="tel"
            placeholder="010-0000-0000"
            value={addPhone}
            onChange={(e) => setAddPhone(formatPhone(e.target.value))}
            maxLength={13}
          />

          {addError && (
            <p className="text-sm text-state-danger">{addError}</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
