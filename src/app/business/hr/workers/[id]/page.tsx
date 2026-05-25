'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { ArrowLeft, Phone, Building2, CalendarClock, LogIn, MapPin, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'
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
  manual_address: string
  manual_account_bank: string
  manual_account_number: string
  manual_registration_number: string
  manual_company_name: string
  manual_specialty: string
  manual_skill_level: string
}

type ApplicationItem = {
  id: string
  construction_date: string | null
  business_name: string
  care_scope: string | null
}

const HELP_SECTIONS = [
  {
    title: '연결 상태 변경 방법',
    content: '앱으로 초대된 작업자는 연결 상태가 자동으로 바뀝니다. 수동 등록 작업자는 나중에 초대 링크를 보내 앱 연결로 전환할 수 있습니다.',
  },
  {
    title: '근무 이력 확인 방법',
    content: '페이지 아래쪽 "작업 이력" 섹션에서 해당 작업자가 배정된 현장 목록을 확인할 수 있습니다. 최근 10건까지 표시됩니다.',
  },
]

export default function WorkerDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [helpOpen, setHelpOpen] = useState(false)

  const [connection, setConnection] = useState<Connection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [applications, setApplications] = useState<ApplicationItem[]>([])

  const [form, setForm] = useState<EditForm>({
    display_name: '',
    manual_phone: '',
    manual_address: '',
    manual_account_bank: '',
    manual_account_number: '',
    manual_registration_number: '',
    manual_company_name: '',
    manual_specialty: '',
    manual_skill_level: '',
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
      setIsDemo(json.isDemo === true)
      const conn: Connection = json.data
      setConnection(conn)
      setForm({
        display_name: conn.display_name ?? '',
        manual_phone: conn.manual_phone ?? '',
        manual_address: conn.manual_address ?? '',
        manual_account_bank: conn.manual_account_bank ?? '',
        manual_account_number: conn.manual_account_number ?? '',
        manual_registration_number: conn.manual_registration_number ?? '',
        manual_company_name: conn.manual_company_name ?? '',
        manual_specialty: conn.manual_specialty ?? '',
        manual_skill_level: conn.manual_skill_level ?? '',
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
          manual_address: form.manual_address || null,
          manual_account_bank: form.manual_account_bank || null,
          manual_account_number: form.manual_account_number || null,
          manual_registration_number: form.manual_registration_number || null,
          manual_company_name: form.manual_company_name || null,
          manual_specialty: form.manual_specialty || null,
          manual_skill_level: form.manual_skill_level || null,
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

      {/* 데모 배너 */}
      {isDemo && (
        <div className="flex items-center justify-between gap-3 bg-brand-50 border border-brand-200 rounded-2xl px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-700">데모 모드로 둘러보는 중이에요</p>
            <p className="text-xs text-brand-600 mt-0.5 break-keep">가입하면 나만의 사업장을 관리할 수 있어요.</p>
          </div>
          <Link
            href="/login/register"
            className="flex-shrink-0 flex items-center gap-1.5 bg-brand-600 text-white text-xs font-semibold px-3 h-9 rounded-lg hover:bg-brand-700 transition-colors"
          >
            <LogIn size={14} />
            가입하기
          </Link>
        </div>
      )}

      <HelpBanner label="직원 상세 페이지 안내 보기" onClick={() => setHelpOpen(true)} />
      <HelpTip>연결된 직원은 앱에서 출퇴근 체크와 일정을 확인할 수 있습니다.</HelpTip>
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="직원 상세 페이지 안내"
        sections={HELP_SECTIONS}
      />

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
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary flex items-center gap-1">
            <MapPin size={12} />
            주소
          </label>
          <input
            type="text"
            value={form.manual_address}
            onChange={(e) => setField('manual_address', e.target.value)}
            disabled={isAppConnected}
            placeholder="예: 서울시 강남구 테헤란로 123"
            className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
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
        <Input
          label="특기"
          placeholder="예: 고층 작업, 에어컨 세척"
          value={form.manual_specialty}
          onChange={(e) => setField('manual_specialty', e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary">능력</label>
          <select
            value={form.manual_skill_level}
            onChange={(e) => setField('manual_skill_level', e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">선택 안 함</option>
            <option value="상">상</option>
            <option value="중">중</option>
            <option value="하">하</option>
          </select>
        </div>
      </div>

      {/* 섹션 3: 작업 이력 */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="text-text-secondary" />
          <SectionHeader title="작업 이력" level="section" />
        </div>
        {applications.length === 0 ? (
          <p className="text-sm text-text-tertiary py-1">아직 배정된 현장이 없습니다.</p>
        ) : (
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
        )}
        <Link
          href="/business/hr/payroll"
          className="flex items-center gap-2 mt-1 px-3 py-2.5 rounded-xl bg-surface-sunken hover:bg-border text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <DollarSign size={15} className="text-brand-500 shrink-0" />
          <span className="break-keep">급여 종합 관리는 <span className="font-medium text-brand-600">운영 &gt; 급여관리</span>에서 하세요</span>
        </Link>
      </div>

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
