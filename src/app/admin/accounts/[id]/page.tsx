'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'

interface PageProps {
  params: Promise<{ id: string }>
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type PlanType = 'free' | 'basic' | 'pro' | 'max'

interface AccountDetail {
  business: {
    id: string
    profile_id: string
    business_name: string
    registration_number: string | null
    address: string | null
    representative_name: string | null
    plan: string
    plan_expires_at: string | null
    created_at: string
  }
  profile: {
    name: string
    phone: string
    email: string | null
  } | null
  worker: {
    account_bank: string | null
    account_number: string | null
    birthdate: string | null
  } | null
}

interface EditForm {
  business_name: string
  registration_number: string
  address: string
  representative_name: string
  name: string
  email: string
  phone: string
  plan: PlanType
  plan_expires_at: string
}

const PLAN_OPTIONS: { value: PlanType; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
  { value: 'max', label: 'Max' },
]

function formatDate(dateStr: string) {
  return dateStr.slice(0, 10)
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border-subtle last:border-0">
      <span className="text-xs text-text-tertiary">{label}</span>
      <span className="text-sm text-text-primary">{value || '미입력'}</span>
    </div>
  )
}

const ACCOUNT_DETAIL_HELP_SECTIONS = [
  {
    title: '정보 수정 방법',
    content: '각 입력 필드를 탭해 직접 수정하세요. 수정 후 하단의 저장 버튼을 누르면 즉시 반영됩니다. 취소 버튼을 누르면 수정 전 값으로 돌아갑니다.',
  },
  {
    title: '플랜 변경',
    content: '플랜 설정 섹션에서 플랜을 선택하고 만료일을 지정하세요.\nFree: 무료\nBasic: 기본 유료\nPro: 프로\nMax: 최상위\n\n플랜 변경 후 반드시 저장 버튼을 눌러야 적용됩니다.',
  },
  {
    title: '가입 정보 (수정 불가)',
    content: '가입 정보 섹션(가입일, 생년월일)은 조회 전용입니다. 수정이 필요한 경우 관리자에게 문의하세요.',
  },
]

export default function AdminAccountDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  const [detail, setDetail] = useState<AccountDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)

  const [form, setForm] = useState<EditForm>({
    business_name: '',
    registration_number: '',
    address: '',
    representative_name: '',
    name: '',
    email: '',
    phone: '',
    plan: 'free',
    plan_expires_at: '',
  })

  const fetchDetail = useCallback(async () => {
    setIsLoading(true)
    setPageError(null)
    try {
      const res = await fetch(`/api/admin/accounts/${id}`)
      const json = await res.json()
      if (!json.success) {
        setPageError(json.error ?? '계정 정보를 불러오지 못했습니다.')
        return
      }
      const data: AccountDetail = json.data
      setDetail(data)
      setForm({
        business_name: data.business.business_name ?? '',
        registration_number: data.business.registration_number ?? '',
        address: data.business.address ?? '',
        representative_name: data.business.representative_name ?? '',
        name: data.profile?.name ?? '',
        email: data.profile?.email ?? '',
        phone: data.profile?.phone ?? '',
        plan: (data.business.plan as PlanType) ?? 'free',
        plan_expires_at: data.business.plan_expires_at
          ? formatDate(data.business.plan_expires_at)
          : '',
      })
    } catch {
      setPageError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const setField = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const res = await fetch(`/api/admin/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: form.business_name || null,
          registration_number: form.registration_number || null,
          address: form.address || null,
          representative_name: form.representative_name || null,
          name: form.name || null,
          email: form.email || null,
          phone: form.phone || null,
          plan: form.plan,
          plan_expires_at: form.plan_expires_at || null,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setSaveStatus('error')
        setSaveError(json.error ?? '저장에 실패했습니다.')
        return
      }
      setSaveStatus('saved')
      router.refresh()
      await fetchDetail()
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
      setSaveError('네트워크 오류가 발생했습니다.')
    }
  }

  const handleCancel = () => {
    if (detail) {
      setForm({
        business_name: detail.business.business_name ?? '',
        registration_number: detail.business.registration_number ?? '',
        address: detail.business.address ?? '',
        representative_name: detail.business.representative_name ?? '',
        name: detail.profile?.name ?? '',
        email: detail.profile?.email ?? '',
        phone: detail.profile?.phone ?? '',
        plan: (detail.business.plan as PlanType) ?? 'free',
        plan_expires_at: detail.business.plan_expires_at
          ? formatDate(detail.business.plan_expires_at)
          : '',
      })
    }
    setSaveStatus('idle')
    setSaveError(null)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
        <div className="h-8 w-24 bg-surface-sunken rounded animate-pulse" />
        <div className="h-32 bg-surface rounded-2xl animate-pulse" />
        <div className="h-48 bg-surface rounded-2xl animate-pulse" />
        <div className="h-32 bg-surface rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (pageError || !detail) {
    return (
      <div className="flex flex-col items-center gap-3 pt-20 px-4">
        <p className="text-sm text-state-danger">{pageError ?? '계정을 찾을 수 없습니다.'}</p>
        <Button variant="secondary" size="sm" onClick={() => router.push('/admin/accounts')}>
          목록으로
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-28">
      {/* 뒤로가기 */}
      <button
        type="button"
        onClick={() => router.push('/admin/accounts')}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-brand-600 active:opacity-60 cursor-pointer -ml-1 self-start transition-colors"
      >
        <ArrowLeft size={16} />
        계정 목록
      </button>

      {/* 도움말 배너 */}
      <HelpBanner label="계정 상세 수정 방법 보기" onClick={() => setHelpOpen(true)} />
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="계정 상세 수정 방법"
        sections={ACCOUNT_DETAIL_HELP_SECTIONS}
      />

      {/* 페이지 타이틀 */}
      <SectionHeader
        title={detail.business.business_name}
        description={`가입일: ${formatDate(detail.business.created_at)}`}
        level="page"
      />

      {/* 읽기 전용: 가입 정보 */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-5 flex flex-col gap-1">
        <SectionHeader title="가입 정보" level="section" className="mb-2" />
        <InfoRow label="가입일" value={formatDate(detail.business.created_at)} />
        {detail.worker && (
          <InfoRow label="생년월일" value={detail.worker.birthdate ?? ''} />
        )}
      </div>

      {/* 사업체 정보 수정 */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-5 flex flex-col gap-4">
        <SectionHeader title="사업체 정보" level="section" />
        <Input
          label="상호명"
          value={form.business_name}
          onChange={(e) => setField('business_name', e.target.value)}
          placeholder="상호명"
        />
        <Input
          label="사업자번호"
          value={form.registration_number}
          onChange={(e) => setField('registration_number', e.target.value)}
          placeholder="000-00-00000"
        />
        <Input
          label="주소"
          value={form.address}
          onChange={(e) => setField('address', e.target.value)}
          placeholder="주소"
        />
        <Input
          label="대표자명"
          value={form.representative_name}
          onChange={(e) => setField('representative_name', e.target.value)}
          placeholder="대표자명"
        />
      </div>

      {/* 대표 연락처 수정 */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-5 flex flex-col gap-4">
        <SectionHeader title="대표 연락처" level="section" />
        <Input
          label="이름"
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="이름"
        />
        <Input
          label="이메일"
          type="email"
          value={form.email}
          onChange={(e) => setField('email', e.target.value)}
          placeholder="example@email.com"
        />
        <Input
          label="전화번호"
          type="tel"
          value={form.phone}
          onChange={(e) => setField('phone', e.target.value)}
          placeholder="010-0000-0000"
        />
      </div>

      {/* 플랜 설정 */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-5 flex flex-col gap-4">
        <SectionHeader title="플랜 설정" level="section" />

        <div className="flex flex-col gap-1.5">
          <label className="block text-sm font-medium text-text-primary">
            플랜
          </label>
          <select
            value={form.plan}
            onChange={(e) => setField('plan', e.target.value as PlanType)}
            className="block w-full h-12 rounded-md bg-surface border border-border text-text-primary px-4 text-base focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
          >
            {PLAN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="플랜 만료일"
          type="date"
          value={form.plan_expires_at}
          onChange={(e) => setField('plan_expires_at', e.target.value)}
        />
      </div>

      {/* 하단 고정 버튼 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border-subtle px-4 py-4 flex gap-3 max-w-lg mx-auto">
        {saveError && (
          <p className="text-xs text-state-danger absolute -top-6 left-4">{saveError}</p>
        )}
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={saveStatus === 'saving'}
          className="shrink-0"
        >
          취소
        </Button>
        <Button
          fullWidth
          onClick={handleSave}
          isLoading={saveStatus === 'saving'}
        >
          {saveStatus === 'saved' ? '저장됨' : '저장'}
        </Button>
      </div>
    </div>
  )
}
