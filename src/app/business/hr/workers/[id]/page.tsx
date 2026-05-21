'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { ArrowLeft, Phone, Building2, CalendarClock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { Connection } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const AVATAR_COLORS = [
  'bg-brand-100 text-brand-700',
  'bg-emerald-100 text-emerald-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
]

function getAvatarColor(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

interface EditForm {
  display_name: string
  manual_phone: string
  manual_account_bank: string
  manual_account_number: string
  manual_registration_number: string
  manual_company_name: string
}

type ApplicationItem = {
  id: string
  construction_date: string | null
  business_name: string
  care_scope: string | null
}

export default function WorkerDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  const [connection, setConnection] = useState<Connection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [applications, setApplications] = useState<ApplicationItem[]>([])

  const [form, setForm] = useState<EditForm>({
    display_name: '',
    manual_phone: '',
    manual_account_bank: '',
    manual_account_number: '',
    manual_registration_number: '',
    manual_company_name: '',
  })

  const fetchConnection = useCallback(async () => {
    setIsLoading(true)
    setPageError(null)
    try {
      const res = await fetch(`/api/business/hr/connections/${id}`)
      const json = await res.json()
      if (!json.success) {
        setPageError(json.error ?? '작업자를 불러오지 못했습니다.')
        return
      }
      const conn: Connection = json.data
      setConnection(conn)
      setForm({
        display_name: conn.display_name ?? '',
        manual_phone: conn.manual_phone ?? '',
        manual_account_bank: conn.manual_account_bank ?? '',
        manual_account_number: conn.manual_account_number ?? '',
        manual_registration_number: conn.manual_registration_number ?? '',
        manual_company_name: conn.manual_company_name ?? '',
      })
    } catch {
      setPageError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch(`/api/business/hr/payroll`)
      const json = await res.json()
      if (!json.success) return
      const all = json.data ?? []
      const mine = all.filter((a: { assigned_connection_ids: string[] | null }) =>
        (a.assigned_connection_ids ?? []).includes(id)
      )
      setApplications(mine)
    } catch {
      // silent
    }
  }, [id])

  useEffect(() => {
    fetchConnection()
    fetchApplications()
  }, [fetchConnection, fetchApplications])

  const setField = (key: keyof EditForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const res = await fetch(`/api/business/hr/connections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: form.display_name,
          manual_name: form.display_name,
          manual_phone: form.manual_phone || null,
          manual_account_bank: form.manual_account_bank || null,
          manual_account_number: form.manual_account_number || null,
          manual_registration_number: form.manual_registration_number || null,
          manual_company_name: form.manual_company_name || null,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setSaveStatus('error')
        setSaveError(json.error ?? '저장에 실패했습니다.')
        return
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
      setSaveError('네트워크 오류가 발생했습니다.')
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await fetch(`/api/business/hr/connections/${id}`, { method: 'DELETE' })
      router.push('/business/hr/workers')
    } catch {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
        <div className="h-8 w-24 bg-surface-sunken rounded animate-pulse" />
        <div className="h-24 bg-surface rounded-2xl animate-pulse" />
        <div className="h-40 bg-surface rounded-2xl animate-pulse" />
        <div className="h-40 bg-surface rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (pageError || !connection) {
    return (
      <div className="flex flex-col items-center gap-3 pt-20 px-4">
        <p className="text-sm text-state-danger">{pageError ?? '작업자를 찾을 수 없습니다.'}</p>
        <Button variant="secondary" size="sm" onClick={() => router.back()}>돌아가기</Button>
      </div>
    )
  }

  const displayPhone = connection.is_manual
    ? form.manual_phone
    : (connection.profiles?.phone ?? form.manual_phone)

  const isAppConnected = !connection.is_manual && connection.status === 'accepted'

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-28">
      {/* 뒤로가기 */}
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-brand-600 active:opacity-60 cursor-pointer -ml-1 self-start transition-colors"
      >
        <ArrowLeft size={16} />
        작업자 관리
      </button>

      {/* 헤더 아바타 */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${getAvatarColor(connection.display_name)}`}>
          {connection.display_name.charAt(0)}
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl font-bold text-text-primary">{connection.display_name}</span>
          {isAppConnected ? (
            <Badge variant="success">앱 연결됨</Badge>
          ) : connection.status === 'pending' ? (
            <Badge variant="warning">초대중</Badge>
          ) : (
            <Badge variant="default">수동등록</Badge>
          )}
          {displayPhone && (
            <div className="flex items-center gap-1 mt-1">
              <Phone size={13} className="text-text-tertiary" />
              <span className="text-sm text-text-secondary">{displayPhone}</span>
            </div>
          )}
        </div>
      </div>

      {/* 섹션 1: 기본 정보 */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-5 flex flex-col gap-4">
        <SectionHeader title="기본 정보" level="section" />

        {isAppConnected && connection.profiles && (
          <div className="bg-surface-sunken rounded-xl p-3 text-xs text-text-secondary break-keep leading-relaxed">
            앱 계정이 연결된 작업자입니다. 이름과 전화번호는 앱 프로필 기준으로 자동 표시됩니다.
          </div>
        )}

        <Input
          label="이름"
          value={form.display_name}
          onChange={(e) => setField('display_name', e.target.value)}
          disabled={isAppConnected}
        />
        <Input
          label="전화번호"
          type="tel"
          value={form.manual_phone}
          onChange={(e) => setField('manual_phone', e.target.value)}
          disabled={isAppConnected}
          placeholder="010-0000-0000"
        />
      </div>

      {/* 섹션 2: 세부정보 */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-text-secondary" />
          <SectionHeader title="세부정보" level="section" />
        </div>
        <Input
          label="상호명"
          placeholder="예: 홍길동 청소"
          value={form.manual_company_name}
          onChange={(e) => setField('manual_company_name', e.target.value)}
        />
        <div className="flex gap-3">
          <Input
            label="은행"
            placeholder="예: 국민은행"
            value={form.manual_account_bank}
            onChange={(e) => setField('manual_account_bank', e.target.value)}
          />
          <Input
            label="계좌번호"
            placeholder="계좌번호"
            value={form.manual_account_number}
            onChange={(e) => setField('manual_account_number', e.target.value)}
          />
        </div>
        <Input
          label="사업자등록번호"
          placeholder="000-00-00000"
          value={form.manual_registration_number}
          onChange={(e) => setField('manual_registration_number', e.target.value)}
        />
      </div>

      {/* 섹션 3: 작업 이력 */}
      {applications.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock size={18} className="text-text-secondary" />
            <SectionHeader title="작업 이력" level="section" />
          </div>
          <div className="flex flex-col gap-2">
            {applications.slice(0, 10).map((app) => (
              <div key={app.id} className="flex items-center justify-between text-sm py-2 border-b border-border-subtle last:border-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-text-primary font-medium break-keep">{app.business_name}</span>
                  {app.care_scope && (
                    <span className="text-xs text-text-tertiary break-keep">{app.care_scope}</span>
                  )}
                </div>
                <span className="text-text-secondary shrink-0 ml-3">
                  {app.construction_date
                    ? new Date(app.construction_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                    : '날짜 미정'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 저장/삭제 */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border-subtle px-4 py-4 flex gap-3 max-w-lg mx-auto">
        {saveError && (
          <p className="text-xs text-state-danger absolute -top-6 left-4">{saveError}</p>
        )}
        <Button
          variant="secondary"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
          className="shrink-0"
        >
          삭제
        </Button>
        <Button
          fullWidth
          onClick={handleSave}
          isLoading={saveStatus === 'saving'}
        >
          {saveStatus === 'saved' ? '저장됨' : '저장'}
        </Button>
      </div>

      {/* 삭제 확인 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-2xl shadow-modal p-6 flex flex-col gap-4">
            <p className="font-bold text-text-primary text-lg">작업자를 삭제할까요?</p>
            <p className="text-sm text-text-secondary break-keep">
              {connection.display_name} 작업자를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" fullWidth onClick={() => setShowDeleteConfirm(false)}>취소</Button>
              <Button variant="danger" fullWidth onClick={handleDelete} isLoading={isDeleting}>삭제</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
