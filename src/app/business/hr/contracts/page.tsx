'use client'

import { useState, useEffect, useCallback, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FilePen, Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'
import { HelpIcon } from '@/components/ui/HelpIcon'
import { usePlanType } from '@/hooks/usePlanType'
import { canUseFeature } from '@/lib/plan-features'
import { AuthContext } from '@/contexts/AuthContext'

// ─── 타입 ────────────────────────────────────────────────────────

type SigningStatus = 'draft' | 'pending_customer' | 'customer_signed' | 'completed' | 'voided'

interface ContractRow {
  id:             string
  signing_status: SigningStatus
  monthly_price:  number
  annual_price:   number
  start_date:     string
  end_date:       string
  customer_phone: string
  created_at:     string
  service_applications: {
    owner_name:    string
    business_name: string
  } | null
}

interface ApplicationOption {
  id:            string
  owner_name:    string
  business_name: string
  phone:         string
}

interface TemplateOption {
  id:   string
  name: string
}

interface CreateForm {
  application_id: string
  template_id:    string
  customer_phone: string
  monthly_price:  string
  annual_price:   string
  start_date:     string
  end_date:       string
  selected_items: string
}

// ─── 상수 ────────────────────────────────────────────────────────

const TABS: { key: string; label: string }[] = [
  { key: '',                label: '전체' },
  { key: 'pending_customer', label: '서명대기' },
  { key: 'customer_signed', label: '고객서명완료' },
  { key: 'completed',       label: '완료' },
  { key: 'voided',          label: '파기' },
]

const STATUS_LABEL: Record<SigningStatus, string> = {
  draft:            '초안',
  pending_customer: '서명대기',
  customer_signed:  '고객서명완료',
  completed:        '완료',
  voided:           '파기',
}

const STATUS_VARIANT: Record<SigningStatus, 'default' | 'warning' | 'info' | 'success' | 'danger' | 'primary'> = {
  draft:            'default',
  pending_customer: 'warning',
  customer_signed:  'info',
  completed:        'success',
  voided:           'danger',
}

const EMPTY_FORM: CreateForm = {
  application_id: '',
  template_id:    '',
  customer_phone: '',
  monthly_price:  '',
  annual_price:   '',
  start_date:     '',
  end_date:       '',
  selected_items: '',
}

// ─── 유틸 ────────────────────────────────────────────────────────

const fmtKr   = (n: number) => n.toLocaleString('ko-KR')
const fmtDate = (s: string) => s.slice(0, 10)

// ─── 메인 페이지 ─────────────────────────────────────────────────

const HELP_SECTIONS = [
  {
    title: '계약서란?',
    content: '청소 서비스 계약 내용을 디지털 문서로 작성하고 보관하는 기능입니다. OTP 전자 서명으로 고객과 관리자가 각각 서명할 수 있어, 분쟁 발생 시 법적 근거 자료로 활용할 수 있습니다.',
  },
  {
    title: 'OTP 전자 서명 방법',
    content: '1. "새 계약서" 버튼으로 계약서를 생성합니다.\n2. 생성된 계약서 상세 페이지에서 "OTP 발송" 버튼을 누릅니다.\n3. 고객 연락처로 인증번호(OTP)가 문자 발송됩니다.\n4. 고객이 인증번호를 입력하면 고객 서명이 완료됩니다.\n5. 관리자가 최종 완료 처리를 하면 계약이 확정됩니다.',
  },
  {
    title: '서명 완료 후 주의사항',
    content: '서명이 완료된 계약서는 내용 수정이 불가능합니다. 내용 변경이 필요하다면 기존 계약서를 파기하고 새 계약서를 작성해야 합니다. 파기된 계약서는 기록으로 남아 조회할 수 있습니다.',
  },
  {
    title: '계약서 활용 팁',
    content: '정기 서비스 고객에게 계약서를 발행하면 서비스 범위·금액·기간이 명확히 기록되어 분쟁을 예방할 수 있습니다. "양식 관리(톱니바퀴)" 버튼에서 자주 사용하는 계약 양식을 미리 만들어 두면 빠르게 계약서를 생성할 수 있습니다.',
  },
]

export default function ContractsPage() {
  const router = useRouter()
  const { planType, isLoading: planLoading } = usePlanType()
  const auth = useContext(AuthContext)
  const isGuest = !auth?.isLoading && !auth?.user
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('')
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)

  // 새 계약서 모달
  const [showCreate, setShowCreate]     = useState(false)
  const [form, setForm]                 = useState<CreateForm>(EMPTY_FORM)
  const [creating, setCreating]         = useState(false)
  const [createError, setCreateError]   = useState<string | null>(null)
  const [applications, setApplications] = useState<ApplicationOption[]>([])
  const [templates, setTemplates]       = useState<TemplateOption[]>([])

  // ── 목록 로딩 ─────────────────────────────────────────────────
  const loadContracts = useCallback(async (status: string) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const params = status ? `?status=${status}` : ''
      const res    = await fetch(`/api/admin/contracts${params}`)
      const json   = await res.json()
      if (!res.ok) throw new Error(json.error ?? '로딩 실패')
      setContracts(json.contracts ?? [])
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '로딩 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadContracts(activeTab) }, [loadContracts, activeTab])

  // ── 모달 열기 시 선택지 로딩 ──────────────────────────────────
  const handleOpenCreate = async () => {
    setForm(EMPTY_FORM)
    setCreateError(null)
    setShowCreate(true)
    try {
      const [appRes, tplRes] = await Promise.all([
        fetch('/api/admin/applications'),
        fetch('/api/admin/contract-templates?is_active=true'),
      ])
      const appJson = await appRes.json()
      const tplJson = await tplRes.json()
      setApplications(appJson.data ?? [])
      setTemplates(tplJson.templates ?? [])
    } catch {
      // 선택지 로딩 실패는 무시
    }
  }

  // ── 계약서 생성 ───────────────────────────────────────────────
  const handleCreate = async () => {
    setCreateError(null)
    if (!form.application_id) { setCreateError('신청서를 선택해 주세요'); return }
    if (!form.template_id)    { setCreateError('계약 양식을 선택해 주세요'); return }
    if (!form.customer_phone) { setCreateError('고객 연락처를 입력해 주세요'); return }
    if (!form.start_date)     { setCreateError('시작일을 입력해 주세요'); return }
    if (!form.end_date)       { setCreateError('종료일을 입력해 주세요'); return }

    setCreating(true)
    try {
      const selectedItems = form.selected_items
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)

      const res = await fetch('/api/admin/contracts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: form.application_id,
          template_id:    form.template_id,
          customer_phone: form.customer_phone,
          monthly_price:  Number(form.monthly_price) || 0,
          annual_price:   Number(form.annual_price)  || 0,
          start_date:     form.start_date,
          end_date:       form.end_date,
          selected_items: selectedItems,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '생성 실패')

      setShowCreate(false)
      await loadContracts(activeTab)
      router.push(`/business/hr/contracts/${json.contract.id}`)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : '생성 실패')
    } finally {
      setCreating(false)
    }
  }

  const setField = (key: keyof CreateForm, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  // ─── 렌더링 ──────────────────────────────────────────────────
  if (!planLoading && !isGuest && !canUseFeature(planType, 'contracts')) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1 -ml-1 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <SectionHeader title="계약서 관리" level="page" className="flex-1" />
        </div>
        <UpgradeModal
          open={true}
          onClose={() => setUpgradeOpen(false)}
          featureName="계약서 관리"
          requiredPlan="max"
          currentPlan={planType}
        />
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <p className="text-sm text-text-secondary break-keep">맥스 플랜에서 이용할 수 있습니다.</p>
          <Button variant="secondary" size="sm" onClick={() => setUpgradeOpen(true)}>플랜 업그레이드 안내</Button>
        </div>
        {upgradeOpen && (
          <UpgradeModal
            open={upgradeOpen}
            onClose={() => setUpgradeOpen(false)}
            featureName="계약서 관리"
            requiredPlan="max"
            currentPlan={planType}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">

      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 -ml-1 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <SectionHeader title="계약서 관리" level="page" className="flex-1" />
        <button
          type="button"
          onClick={() => router.push('/business/hr/contracts/templates')}
          className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors"
          title="양식 관리"
        >
          <Settings size={18} />
        </button>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus size={14} />
          새 계약서
        </Button>
        <HelpIcon
          title="계약서 생성"
          description="계약서는 고객과의 서비스 계약 내용을 문서화합니다. 신청서를 선택하고 계약 기간·금액을 입력하면 생성됩니다. 생성 후 OTP 인증으로 고객 전자 서명을 받을 수 있습니다."
        />
      </div>

      <HelpBanner label="계약서 관리 사용법 보기" onClick={() => setHelpOpen(true)} />
      <HelpTip variant="warning">계약서는 맥스 플랜에서 사용 가능합니다. 계약서 생성 전 서비스 신청서가 먼저 등록되어 있어야 합니다.</HelpTip>
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="계약서 관리 사용법"
        sections={HELP_SECTIONS}
      />

      {/* 탭 */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${activeTab === tab.key
                ? 'bg-brand-600 text-white'
                : 'bg-surface-sunken text-text-secondary hover:bg-border'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <HelpTip>
        초안: 생성 직후, 아직 발송 전 · 서명대기: OTP 발송 후 고객 서명 대기 중 · 고객서명완료: 고객이 서명함, 관리자 완료 처리 필요 · 완료: 계약 최종 확정 · 파기: 취소된 계약
      </HelpTip>

      {/* 에러 */}
      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-state-danger-bg border border-state-danger text-sm text-state-danger">
          {errorMsg}
        </div>
      )}

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-text-tertiary">
          로딩 중…
        </div>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
            <FilePen size={28} className="text-amber-400" />
          </div>
          <p className="text-sm font-medium text-text-primary">
            {activeTab ? '해당 상태의 계약서가 없습니다' : '등록된 계약서가 없습니다'}
          </p>
          <p className="text-xs text-text-tertiary break-keep">
            새 계약서 버튼을 눌러 계약서를 작성해 보세요
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {contracts.map(c => {
            const app = c.service_applications
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/business/hr/contracts/${c.id}`)}
                  className="w-full text-left p-4 rounded-2xl bg-surface border border-border-subtle shadow-flat hover:border-border active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {app?.business_name ?? '—'}
                    </span>
                    <Badge variant={STATUS_VARIANT[c.signing_status]}>
                      {STATUS_LABEL[c.signing_status]}
                    </Badge>
                  </div>
                  <div className="text-xs text-text-secondary">{app?.owner_name ?? '—'}</div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-text-tertiary tabular-nums">
                    {c.monthly_price > 0 && <span>월 {fmtKr(c.monthly_price)}원</span>}
                    {c.monthly_price > 0 && (c.start_date || c.end_date) && <span>·</span>}
                    {(c.start_date || c.end_date) && (
                      <span>{fmtDate(c.start_date)} ~ {fmtDate(c.end_date)}</span>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* ── 새 계약서 모달 ────────────────────────────────────── */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="새 계약서"
        footer={
          <>
            {createError && (
              <p className="text-xs text-state-danger text-center">{createError}</p>
            )}
            <Button onClick={handleCreate} isLoading={creating} fullWidth>
              계약서 생성
            </Button>
          </>
        }
      >
        <div className="space-y-4">

          {/* 신청서 선택 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              신청서 선택
            </label>
            <select
              className="w-full h-12 px-4 rounded-md border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              value={form.application_id}
              onChange={e => {
                const app = applications.find(a => a.id === e.target.value)
                setField('application_id', e.target.value)
                if (app) setField('customer_phone', app.phone)
              }}
            >
              <option value="">신청서를 선택하세요</option>
              {applications.map(a => (
                <option key={a.id} value={a.id}>
                  {a.owner_name} / {a.business_name} ({a.phone})
                </option>
              ))}
            </select>
          </div>

          {/* 계약 양식 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              계약 양식
            </label>
            <select
              className="w-full h-12 px-4 rounded-md border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              value={form.template_id}
              onChange={e => setField('template_id', e.target.value)}
            >
              <option value="">양식을 선택하세요</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* 고객 연락처 */}
          <Input
            label="고객 전화번호"
            value={form.customer_phone}
            onChange={e => setField('customer_phone', e.target.value)}
            placeholder="010-0000-0000"
          />

          {/* 요금 */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="월 요금 (원)"
              type="number"
              value={form.monthly_price}
              onChange={e => setField('monthly_price', e.target.value)}
              placeholder="0"
            />
            <Input
              label="연간 요금 (원)"
              type="number"
              value={form.annual_price}
              onChange={e => setField('annual_price', e.target.value)}
              placeholder="0"
            />
          </div>

          {/* 계약 기간 */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="시작일"
              type="date"
              value={form.start_date}
              onChange={e => setField('start_date', e.target.value)}
            />
            <Input
              label="종료일"
              type="date"
              value={form.end_date}
              onChange={e => setField('end_date', e.target.value)}
            />
          </div>

          {/* 서비스 범위 */}
          <Textarea
            label="서비스 범위 (줄바꿈으로 항목 구분)"
            value={form.selected_items}
            onChange={e => setField('selected_items', e.target.value)}
            placeholder={"주방후드 청소\n바닥 왁싱\n에어컨 필터 세척"}
            rows={4}
          />
        </div>
      </Modal>
    </div>
  )
}
