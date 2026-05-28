'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Check, Minus, CheckCircle2,
  MessageSquare, ClipboardList, Users,
  Crown, Zap, Star, Settings, Globe, Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { HelpTip } from '@/components/ui/HelpTip'
import { PLAN_NAMES, PLAN_PRICES, toPlanType } from '@/lib/plan-features'
import type { PlanType } from '@/lib/plan-features'
import { usePlanFeatures } from '@/contexts/PlanFeaturesContext'
import type { FeatureMeta } from '@/contexts/PlanFeaturesContext'

const PLAN_KEYS: Exclude<PlanType, 'free'>[] = ['basic', 'pro', 'max']
const ALL_PLAN_KEYS: PlanType[] = ['free', 'basic', 'pro', 'max']

const PLAN_ORDER: Record<string, number> = {
  free: 0, basic: 1, pro: 2, max: 3,
}

type RequestType = 'upgrade' | 'renewal' | 'downgrade'

function getRequestType(current: PlanType, selected: Exclude<PlanType, 'free'>): RequestType {
  const curr = PLAN_ORDER[current] ?? 0
  const next = PLAN_ORDER[selected] ?? 1
  if (next > curr) return 'upgrade'
  if (next === curr) return 'renewal'
  return 'downgrade'
}

function getRemainingDays(expiresAt: string | null): number {
  if (!expiresAt) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiresAt)
  expiry.setHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
}

function getNewExpiryLabel(currentExpires: string | null): string {
  const base = currentExpires ? new Date(currentExpires) : new Date()
  const extended = new Date(base)
  extended.setDate(extended.getDate() + 30)
  return `${extended.getMonth() + 1}월 ${extended.getDate()}일`
}

function formatKoreanDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  sms:      <MessageSquare size={13} className="text-blue-500" />,
  feature:  <ClipboardList size={13} className="text-green-500" />,
  hr:       <Users size={13} className="text-violet-500" />,
  settings: <Settings size={13} className="text-gray-500" />,
  business: <Globe size={13} className="text-teal-500" />,
}

const CATEGORY_LABEL: Record<string, string> = {
  sms:      'SMS 알림',
  feature:  '서비스 관리',
  hr:       '직원 · HR',
  settings: '설정 · 커스텀',
  business: '비즈니스 확장',
}

const CATEGORY_ORDER = ['sms', 'feature', 'hr', 'settings', 'business']

const PLAN_STYLE: Record<string, {
  badge: string
  border: string
  activeBorder: string
  activeBg: string
  headerBg: string
  icon: React.ReactNode
  iconLg: React.ReactNode
  accent: string
  accentBg: string
  topBar: string
  colBg: string
  tag?: string
}> = {
  free: {
    badge: 'bg-gray-100 text-gray-500',
    border: 'border-border',
    activeBorder: 'border-gray-400',
    activeBg: 'bg-gray-50',
    headerBg: 'bg-gray-50',
    icon: <Circle size={18} className="text-gray-400" />,
    iconLg: <Circle size={22} className="text-gray-400" />,
    accent: 'text-gray-500',
    accentBg: 'bg-gray-100',
    topBar: 'bg-gray-300',
    colBg: 'bg-gray-50/60',
  },
  basic: {
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-border',
    activeBorder: 'border-blue-500',
    activeBg: 'bg-blue-50/40',
    headerBg: 'bg-blue-50',
    icon: <Star size={18} className="text-blue-500" />,
    iconLg: <Star size={22} className="text-blue-500" />,
    accent: 'text-blue-600',
    accentBg: 'bg-blue-100',
    topBar: 'bg-blue-500',
    colBg: 'bg-blue-50/50',
  },
  pro: {
    badge: 'bg-violet-100 text-violet-700',
    border: 'border-border',
    activeBorder: 'border-violet-500',
    activeBg: 'bg-violet-50/40',
    headerBg: 'bg-violet-50',
    icon: <Zap size={18} className="text-violet-500" />,
    iconLg: <Zap size={22} className="text-violet-500" />,
    accent: 'text-violet-600',
    accentBg: 'bg-violet-100',
    topBar: 'bg-violet-500',
    colBg: 'bg-violet-50/50',
    tag: '인기',
  },
  max: {
    badge: 'bg-amber-100 text-amber-700',
    border: 'border-border',
    activeBorder: 'border-amber-500',
    activeBg: 'bg-amber-50/40',
    headerBg: 'bg-amber-50',
    icon: <Crown size={18} className="text-amber-500" />,
    iconLg: <Crown size={22} className="text-amber-500" />,
    accent: 'text-amber-600',
    accentBg: 'bg-amber-100',
    topBar: 'bg-amber-500',
    colBg: 'bg-amber-50/50',
  },
}

// 기능별 상세 설명 및 사용 예시
const FEATURE_DESCRIPTIONS: Record<string, { description: string; example: string }> = {
  application_limit: {
    description: '등록할 수 있는 서비스 신청서의 최대 개수입니다. 한도에 도달하면 완료 처리하거나 삭제한 뒤 새 신청서를 추가할 수 있습니다.',
    example: '베이직 플랜 500건 한도면 연간 수백 건의 계약을 끊김 없이 관리할 수 있습니다.',
  },
  sms_daily_limit: {
    description: '한 달 동안 발송할 수 있는 SMS 메시지의 최대 건수입니다. 매월 1일에 자동으로 초기화됩니다.',
    example: '이번 달 예약 확정·완료 알림을 고객 50명에게 발송하더라도 월 한도 내에서 여유 있게 처리할 수 있습니다.',
  },
  sms_auto_dispatch: {
    description: '신청서 상태가 변경될 때(예약 확정, 작업 완료, 결제 안내 등) 고객에게 SMS를 자동으로 발송합니다. 직접 문자를 보낼 필요가 없습니다.',
    example: '예약 확정 버튼을 누르는 순간 고객에게 일정·주소 안내 문자가 자동으로 전송됩니다.',
  },
  sms_custom_template: {
    description: '자동 발송 SMS 문구를 업체에 맞게 직접 수정할 수 있습니다. 업체 이름이나 브랜드 톤이 담긴 문구로 자유롭게 교체할 수 있습니다.',
    example: '기본 문구 대신 "OO 주방청소입니다. 오늘 오후 2시 방문 예정입니다 :)"처럼 업체명이 포함된 친근한 문자를 보낼 수 있습니다.',
  },
  worker_limit: {
    description: '앱에 등록할 수 있는 작업자(직원)의 최대 인원 수입니다. 한도에 도달하면 기존 작업자를 삭제해야 추가 등록이 가능합니다.',
    example: '프로 플랜 이상에서는 무제한으로 등록할 수 있어 팀이 성장해도 인원 제한 걱정 없이 운영할 수 있습니다.',
  },
  inventory: {
    description: '청소 용품, 소모품 등의 재고를 품목별로 등록하고 입출고를 기록할 수 있습니다. 현재 재고 수량을 실시간으로 파악할 수 있습니다.',
    example: '주방 세제 10통을 입고 처리하고, 현장 투입 시 출고 기록을 남겨 잔여 수량을 바로 확인합니다.',
  },
  marketplace: {
    description: '일잇다 마켓플레이스에 업체를 노출할 수 있습니다. 마켓플레이스를 통해 신규 고객이 직접 업체를 찾아 견적을 신청할 수 있습니다.',
    example: '성남시 주방후드 청소를 검색한 고객이 마켓플레이스에서 업체를 발견하고 바로 신청서를 보냅니다.',
  },
  contracts: {
    description: '정기 계약 고객과의 서비스 계약서를 앱에서 작성하고 전자 서명을 받을 수 있습니다. 계약 기간, 서비스 내용, 금액 등을 명시한 공식 계약서를 관리합니다.',
    example: '정기딥케어 계약 고객에게 링크를 보내면 고객이 OTP 인증 후 전자 서명까지 완료해 계약서가 자동 보관됩니다.',
  },
  app_name_custom: {
    description: '고객과 작업자에게 보이는 앱 이름을 업체명이나 브랜드명으로 변경할 수 있습니다. 기본 \'일잇다\' 대신 자체 브랜드명이 표시됩니다.',
    example: '\'범빌드코리아 관리앱\'으로 설정하면 고객이 링크를 열었을 때 자체 브랜드 앱처럼 보여 신뢰도가 높아집니다.',
  },
  payroll: {
    description: '작업자별 출역 현황을 기반으로 급여를 자동 계산합니다. 일급·건별 단가를 설정하고 월별 급여 내역을 한눈에 확인할 수 있습니다.',
    example: '이번 달 작업자 3명의 현장 출역 횟수를 자동 집계해 급여 명세를 엑셀 없이 즉시 확인합니다.',
  },
  quotations: {
    description: '고객에게 보낼 공식 견적서를 앱에서 작성하고 발송합니다. 직인 이미지가 포함된 PDF 견적서를 카카오톡 링크로 간편하게 전달합니다.',
    example: '현장 방문 후 30분 안에 항목별 단가와 합계가 담긴 견적서 링크를 고객 카카오톡으로 보냅니다.',
  },
  revenue: {
    description: '서비스 완료 건의 결제 금액을 월별·고객별로 집계해 매출 현황을 파악합니다. CSV 내보내기 기능으로 별도 정산 작업도 간편합니다.',
    example: '이번 달 정기딥케어 5건 + 1회성케어 8건 합계 수익을 한 화면에서 바로 파악하고 세금계산서 발행에 활용합니다.',
  },
  fields_settings: {
    description: '신청서에 표시할 항목(필드)을 업종에 맞게 커스텀할 수 있습니다. 불필요한 항목은 숨기고 업체에 필요한 전용 항목을 추가할 수 있습니다.',
    example: '주방후드 청소 업체라면 \'후드 사이즈\', \'설치 유형\' 같은 전용 항목을 신청서에 추가해 견적에 필요한 정보를 미리 수집합니다.',
  },
  public_form: {
    description: '로그인 없이 누구나 접근 가능한 신청서 링크를 생성합니다. 카카오채널, 인스타그램, 웹사이트 등 어디서든 연결할 수 있습니다.',
    example: '인스타그램 프로필 링크에 신청서 URL을 넣으면 고객이 앱 설치 없이 스마트폰으로 바로 견적을 신청합니다.',
  },
  workers: {
    description: '소속 작업자를 앱에 초대하거나 수동으로 등록할 수 있습니다. 각 현장에 작업자를 배정하고 출역 현황을 실시간으로 관리합니다.',
    example: '오늘 3개 현장에 작업자 4명을 배정하고, 누가 어느 현장에서 몇 시에 시작하는지 앱에서 한눈에 확인합니다.',
  },
}

// DB에 등록되지 않은 기능을 위한 fallback 메타데이터
const FEATURE_META_FALLBACK: FeatureMeta[] = [
  { feature_key: 'application_limit',   label: '신청서 목록 한도',    category: 'feature',  feature_type: 'numeric'  },
  { feature_key: 'sms_daily_limit',     label: '월 SMS 발송 한도',    category: 'sms',      feature_type: 'numeric'  },
  { feature_key: 'sms_auto_dispatch',   label: 'SMS 자동 발송',       category: 'sms',      feature_type: 'boolean'  },
  { feature_key: 'sms_custom_template', label: 'SMS 커스텀 문구',     category: 'sms',      feature_type: 'boolean'  },
  { feature_key: 'worker_limit',        label: '작업자 등록 한도',    category: 'hr',       feature_type: 'numeric'  },
  { feature_key: 'inventory',           label: '재고 관리',           category: 'feature',  feature_type: 'boolean'  },
  { feature_key: 'marketplace',         label: '마켓플레이스',        category: 'business', feature_type: 'boolean'  },
  { feature_key: 'contracts',           label: '계약서 관리',         category: 'feature',  feature_type: 'boolean'  },
  { feature_key: 'app_name_custom',     label: '앱 이름 커스텀',      category: 'settings', feature_type: 'boolean'  },
  { feature_key: 'payroll',             label: '급여 관리',           category: 'hr',       feature_type: 'boolean'  },
  { feature_key: 'quotations',          label: '견적서 관리',         category: 'feature',  feature_type: 'boolean'  },
  { feature_key: 'revenue',             label: '매출 관리',           category: 'hr',       feature_type: 'boolean'  },
  { feature_key: 'fields_settings',     label: '필드 설정',           category: 'settings', feature_type: 'boolean'  },
  { feature_key: 'public_form',         label: '공개 신청서 폼',      category: 'feature',  feature_type: 'boolean'  },
  { feature_key: 'workers',             label: '작업자 관리',         category: 'hr',       feature_type: 'boolean'  },
]

// DB meta + fallback 병합 (DB에 이미 있는 키는 제외)
function buildCompleteFeatureList(dbMeta: FeatureMeta[]): FeatureMeta[] {
  const existingKeys = new Set(dbMeta.map(m => m.feature_key))
  const extras = FEATURE_META_FALLBACK.filter(fb => !existingKeys.has(fb.feature_key))
  return [...dbMeta, ...extras]
}

type Classification = 'common' | 'diff' | 'none'

function classifyFeature(
  featureKey: string,
  featureType: 'boolean' | 'numeric',
  f: Record<string, Record<string, unknown>>,
): Classification {
  const values = ALL_PLAN_KEYS.map(p => {
    const v = f[p]?.[featureKey]
    if (featureType === 'numeric' && (v === null || v === undefined)) return Infinity
    return v
  })

  const isNoneValue = (v: unknown) =>
    featureType === 'boolean'
      ? v === false || v === null || v === undefined
      : !v || v === 0

  if (values.every(isNoneValue)) return 'none'

  const first = values[0]
  if (values.every(v => v === first)) return 'common'

  return 'diff'
}

function formatLimit(val: unknown): string {
  if (val === true || val === false) return ''
  if (val === Infinity || val === null || val === undefined) return '무제한'
  const n = Number(val)
  if (!isFinite(n)) return '무제한'
  return `${n.toLocaleString('ko-KR')}건`
}

function FeatureCell({
  featureType, value,
}: {
  featureType: 'boolean' | 'numeric'
  value: unknown
}) {
  if (featureType === 'numeric') {
    const label = formatLimit(value)
    if (label === '무제한') {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-base font-black text-state-success leading-none">∞</span>
          <span className="text-[9px] text-state-success/70 font-medium">무제한</span>
        </div>
      )
    }
    return (
      <span className="text-xs font-bold text-text-primary">{label}</span>
    )
  }
  if (value === true) {
    return (
      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <Check size={13} strokeWidth={3} className="text-state-success" />
      </div>
    )
  }
  return (
    <div className="w-6 h-6 rounded-full bg-surface-sunken flex items-center justify-center mx-auto">
      <Minus size={10} className="text-border-strong opacity-50" />
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function PlanPage() {
  const router = useRouter()
  const { features, meta } = usePlanFeatures()

  const [currentPlan, setCurrentPlan] = useState<PlanType>('free')
  const [expiresAt, setExpiresAt]     = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(true)

  const [selectedPlan, setSelectedPlan] = useState<Exclude<PlanType, 'free'> | null>(null)
  const [requestType, setRequestType]   = useState<RequestType>('upgrade')
  const [paymentOpen, setPaymentOpen]   = useState(false)
  const [depositorName, setDepositorName] = useState('')
  const [isSubmitting, setIsSubmitting]   = useState(false)
  const [submitDone, setSubmitDone]       = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  const [descKey, setDescKey]   = useState<string | null>(null)
  const [descOpen, setDescOpen] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const getMonthlyEquivalent = (plan: Exclude<PlanType, 'free'>) =>
    billingCycle === 'annual' ? Math.floor(PLAN_PRICES[plan] * 0.9) : PLAN_PRICES[plan]

  const getPaymentAmount = (plan: Exclude<PlanType, 'free'>) =>
    billingCycle === 'annual' ? Math.floor(PLAN_PRICES[plan] * 12 * 0.9) : PLAN_PRICES[plan]

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch('/api/business/plan')
        const json = await res.json()
        if (json.success) {
          setCurrentPlan(toPlanType(json.data?.plan))
          setExpiresAt(json.data?.plan_expires_at ?? null)
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  function handleSelect(plan: Exclude<PlanType, 'free'>) {
    setRequestType(getRequestType(currentPlan, plan))
    setSelectedPlan(plan)
    setPaymentOpen(true)
    setSubmitDone(false)
    setDepositorName('')
    setError(null)
  }

  async function handleSubmit() {
    if (!depositorName.trim()) { setError('입금자명을 입력해주세요.'); return }
    setIsSubmitting(true)
    setError(null)
    try {
      const res  = await fetch('/api/business/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_name: selectedPlan, depositor_name: depositorName.trim(), billing_cycle: billingCycle }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error ?? '신청에 실패했습니다.'); return }
      setSubmitDone(true)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const f = features as Record<string, Record<string, unknown>> | null
  const completeMeta = useMemo(() => buildCompleteFeatureList(meta), [meta])

  // 공통 기능 / 차이 기능 분류
  const { commonItems, diffByCategory } = useMemo(() => {
    if (!f) return { commonItems: [] as FeatureMeta[], diffByCategory: [] as { category: string; items: FeatureMeta[] }[] }

    const common: FeatureMeta[] = []
    const diff:   FeatureMeta[] = []

    for (const item of completeMeta) {
      const cls = classifyFeature(item.feature_key, item.feature_type, f)
      if (cls === 'common') common.push(item)
      else if (cls === 'diff') diff.push(item)
    }

    const catMap = new Map<string, FeatureMeta[]>()
    for (const item of diff) {
      if (!catMap.has(item.category)) catMap.set(item.category, [])
      catMap.get(item.category)!.push(item)
    }
    const grouped = CATEGORY_ORDER
      .filter(cat => catMap.has(cat))
      .map(cat => ({ category: cat, items: catMap.get(cat)! }))

    return { commonItems: common, diffByCategory: grouped }
  }, [completeMeta, f])

  const selectedStyle = selectedPlan ? PLAN_STYLE[selectedPlan] : null
  const remainingDays = getRemainingDays(expiresAt)
  const currentStyle  = PLAN_STYLE[currentPlan]

  const modalTitle = (() => {
    if (!selectedPlan) return ''
    const planName = PLAN_NAMES[selectedPlan]
    if (requestType === 'renewal') return `${planName} 플랜 갱신 신청`
    if (requestType === 'downgrade') return `${planName} 플랜 하향 신청`
    return `${planName} 플랜 업그레이드 신청`
  })()

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-24">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/business/profile')}
          className="p-1 -ml-1 text-text-tertiary hover:text-text-primary"
        >
          <ArrowLeft size={20} />
        </button>
        <SectionHeader title="구독 플랜" level="page" />
      </div>

      {/* 현재 플랜 카드 */}
      {isLoading ? (
        <div className="h-24 rounded-2xl bg-surface-sunken animate-pulse" />
      ) : (
        <div className={`rounded-2xl border-2 overflow-hidden ${
          currentPlan === 'free'
            ? 'border-border bg-surface'
            : `${currentStyle?.activeBorder ?? ''} ${currentStyle?.activeBg ?? ''}`
        }`}>
          {currentPlan !== 'free' && (
            <div className={`h-1.5 ${currentStyle?.topBar ?? ''}`} />
          )}
          <div className="px-4 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                currentPlan === 'free' ? 'bg-surface-sunken' : currentStyle?.accentBg ?? ''
              }`}>
                {currentStyle?.iconLg}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-2xl font-black leading-tight ${
                    currentPlan === 'free' ? 'text-text-primary' : currentStyle?.accent ?? ''
                  }`}>
                    {PLAN_NAMES[currentPlan]}
                  </span>
                  <span className="text-[10px] font-bold text-white bg-state-success px-2 py-0.5 rounded-full">
                    현재 플랜
                  </span>
                </div>
                {currentPlan !== 'free' ? (
                  <p className="text-sm font-bold text-text-primary mt-0.5">
                    {PLAN_PRICES[currentPlan].toLocaleString('ko-KR')}
                    <span className="text-xs font-normal text-text-tertiary ml-0.5">원 / 월</span>
                  </p>
                ) : (
                  <p className="text-xs text-text-tertiary mt-0.5">0원 · 무료 플랜</p>
                )}
              </div>
            </div>
            {currentPlan !== 'free' && expiresAt && (
              <div className={`text-right shrink-0 rounded-xl px-3 py-2 ${currentStyle?.accentBg ?? ''}`}>
                <p className="text-[10px] text-text-tertiary">만료일</p>
                <p className={`text-sm font-bold ${remainingDays <= 7 ? 'text-state-danger' : currentStyle?.accent ?? ''}`}>
                  {expiresAt.slice(5, 10).replace('-', '/')}
                </p>
                {remainingDays <= 7 && remainingDays > 0 && (
                  <p className="text-[10px] text-state-danger font-semibold">{remainingDays}일 남음</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <HelpTip>비교표에서 베이직·프로·맥스 열을 탭하면 업그레이드·갱신·하향 신청을 할 수 있습니다. 입금 확인 후 영업일 기준 1일 이내 반영됩니다.</HelpTip>

      {/* 결제 주기 토글 */}
      <div className="flex items-center justify-center">
        <div className="flex bg-surface-sunken rounded-xl p-1 border border-border-subtle">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white shadow-soft text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            월간
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              billingCycle === 'annual'
                ? 'bg-white shadow-soft text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            연간
            <span className="text-[10px] font-black text-state-success bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
              10% 할인
            </span>
          </button>
        </div>
      </div>

      {/* ─── Section 1: 공통 제공 기능 ───────────────────────── */}
      <div className="flex flex-col gap-3">
        <SectionHeader title="모든 플랜 공통 제공 기능" level="section" />
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-text-tertiary mb-3 break-keep">
            무료 플랜을 포함한 모든 플랜에서 동일하게 제공됩니다.
          </p>
          {!f ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-7 w-24 rounded-full bg-surface-sunken animate-pulse" />
              ))}
            </div>
          ) : commonItems.length === 0 ? (
            <p className="text-xs text-text-tertiary">공통 기능 정보를 불러오는 중입니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {commonItems.map(item => {
                const numVal  = item.feature_type === 'numeric' ? f?.free?.[item.feature_key] : null
                const hasDesc = !!FEATURE_DESCRIPTIONS[item.feature_key]
                return (
                  <button
                    key={item.feature_key}
                    type="button"
                    onClick={() => { if (hasDesc) { setDescKey(item.feature_key); setDescOpen(true) } }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-subtle bg-surface-sunken transition-all active:scale-[0.96] ${hasDesc ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}`}
                  >
                    <span className="text-xs text-text-secondary break-keep">{item.label}</span>
                    {numVal !== null && numVal !== undefined && (
                      <span className="text-[11px] font-bold text-state-success ml-0.5">
                        {formatLimit(numVal)}
                      </span>
                    )}
                    {hasDesc && (
                      <span className="text-[11px] text-text-tertiary ml-0.5 leading-none">›</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Section 2: 플랜별 차이점 비교 ────────────────────── */}
      <div className="flex flex-col gap-3">
        <SectionHeader title="플랜별 차이점 비교" level="section" />

        <div className="rounded-2xl border border-border overflow-hidden bg-white shadow-soft">
          <div className="overflow-x-auto">
            <div style={{ minWidth: '380px' }}>

              {/* 컬럼 헤더 */}
              <div
                className="grid border-b-2 border-border bg-white"
                style={{ gridTemplateColumns: '2fr repeat(4, 1fr)' }}
              >
                {/* 기능 레이블 */}
                <div className="px-3 pt-4 pb-3 flex items-end">
                  <span className="text-[10px] font-semibold text-text-tertiary tracking-widest uppercase">기능</span>
                </div>

                {/* free 컬럼 — 탭 불가 */}
                {(() => {
                  const s   = PLAN_STYLE.free
                  const isCur = currentPlan === 'free'
                  return (
                    <div className={`relative border-l border-border flex flex-col items-center pt-3 pb-3 gap-0.5 ${isCur ? s.colBg : ''}`}>
                      <div className={`absolute top-0 left-0 right-0 h-[3px] ${s.topBar}`} />
                      <span>{s.iconLg}</span>
                      <p className={`text-xs font-extrabold leading-tight ${s.accent}`}>{PLAN_NAMES.free}</p>
                      <p className={`text-[10px] ${s.accent}`}>무료</p>
                      {isCur && (
                        <span className="mt-0.5 text-[9px] font-bold text-white bg-state-success px-2 py-0.5 rounded-full">
                          현재
                        </span>
                      )}
                    </div>
                  )
                })()}

                {/* basic / pro / max — 탭 가능 */}
                {PLAN_KEYS.map(k => {
                  const s     = PLAN_STYLE[k]
                  const isCur = currentPlan === k
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleSelect(k)}
                      className={`relative border-l border-border flex flex-col items-center pt-3 pb-3 gap-0.5 active:scale-[0.96] transition-transform ${
                        isCur ? s.colBg : 'hover:bg-surface-sunken'
                      }`}
                    >
                      <div className={`absolute top-0 left-0 right-0 h-[3px] ${s.topBar}`} />
                      {s.tag && (
                        <span className="absolute top-0 right-1 text-[8px] font-black text-white bg-violet-500 px-1.5 py-0.5 rounded-b-md">
                          {s.tag}
                        </span>
                      )}
                      <span>{s.iconLg}</span>
                      <p className={`text-xs font-extrabold leading-tight ${s.accent}`}>{PLAN_NAMES[k]}</p>
                      <div className="flex flex-col items-center">
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xs font-black text-text-primary leading-none">
                            {getMonthlyEquivalent(k).toLocaleString('ko-KR')}
                          </span>
                          <span className="text-[9px] text-text-tertiary">원</span>
                        </div>
                        {billingCycle === 'annual' && (
                          <span className="text-[8px] text-text-tertiary leading-none">월 (연간)</span>
                        )}
                      </div>
                      {isCur ? (
                        <span className="mt-0.5 text-[9px] font-bold text-white bg-state-success px-2 py-0.5 rounded-full">
                          현재
                        </span>
                      ) : (
                        <span className="mt-0.5 text-[8px] text-text-tertiary">탭하여 신청</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* 카테고리별 기능 행 */}
              {diffByCategory.map((cat, catIdx) => (
                <div key={cat.category}>
                  {/* 카테고리 구분 행 */}
                  <div
                    className={catIdx > 0 ? 'border-t-2 border-border' : ''}
                    style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr)' }}
                  >
                    <div
                      className="flex items-center gap-2 px-3 py-2 bg-surface-sunken"
                      style={{ gridColumn: '1 / -1' }}
                    >
                      {CATEGORY_ICON[cat.category] ?? <ClipboardList size={13} className="text-gray-400" />}
                      <span className="text-xs font-bold text-text-secondary">
                        {CATEGORY_LABEL[cat.category] ?? cat.category}
                      </span>
                    </div>
                  </div>

                  {/* 기능 행 */}
                  {cat.items.map((item, i) => {
                    const isLast = i === cat.items.length - 1
                    return (
                      <div
                        key={item.feature_key}
                        className={`grid items-center ${!isLast ? 'border-b border-border-subtle' : ''}`}
                        style={{ gridTemplateColumns: '2fr repeat(4, 1fr)' }}
                      >
                        {/* 기능명 */}
                        <div className="px-3 py-3">
                          <span className="text-xs leading-snug break-keep text-text-secondary">
                            {item.label}
                          </span>
                        </div>

                        {/* 플랜별 셀 (free → basic → pro → max) */}
                        {ALL_PLAN_KEYS.map(plan => {
                          const isCur = currentPlan === plan
                          return (
                            <div
                              key={plan}
                              className={`py-3 flex justify-center items-center border-l border-border-subtle ${
                                isCur ? PLAN_STYLE[plan]?.colBg ?? '' : ''
                              }`}
                            >
                              <FeatureCell
                                featureType={item.feature_type}
                                value={f?.[plan]?.[item.feature_key]}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* 로딩 스켈레톤 */}
              {!f && (
                <div className="flex flex-col gap-2 p-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-10 rounded bg-surface-sunken animate-pulse" />
                  ))}
                </div>
              )}

              {/* 차이 항목 없음 */}
              {f && diffByCategory.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-text-tertiary">비교할 차이 항목이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 플랜 신청 빠른 버튼 */}
        <div className="grid grid-cols-3 gap-2">
          {PLAN_KEYS.map(k => {
            const s     = PLAN_STYLE[k]
            const isCur = currentPlan === k
            return (
              <button
                key={k}
                type="button"
                onClick={() => handleSelect(k)}
                className={`rounded-xl py-3 px-2 text-center transition-all active:scale-[0.97] border-2 ${
                  isCur
                    ? `${s.activeBorder} ${s.activeBg}`
                    : 'border-border bg-surface'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  {s.icon}
                  <span className={`text-xs font-extrabold ${s.accent}`}>{PLAN_NAMES[k]}</span>
                  <span className="text-[11px] font-bold text-text-primary">
                    {getMonthlyEquivalent(k).toLocaleString('ko-KR')}원
                  </span>
                  {billingCycle === 'annual' && (
                    <span className="text-[9px] text-text-tertiary leading-none">/ 월 (연간)</span>
                  )}
                  {isCur ? (
                    <span className="text-[9px] font-bold text-state-success">현재 플랜</span>
                  ) : (
                    <span className="text-[9px] text-text-tertiary">탭하여 신청</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── 기능 설명 모달 ────────────── */}
      {(() => {
        const descMeta = completeMeta.find(m => m.feature_key === descKey)
        const desc     = descKey ? FEATURE_DESCRIPTIONS[descKey] : null
        return (
          <Modal
            open={descOpen}
            onClose={() => setDescOpen(false)}
            title={descMeta?.label ?? '기능 설명'}
            footer={
              <Button fullWidth onClick={() => setDescOpen(false)}>확인</Button>
            }
          >
            {descMeta && desc ? (
              <div className="flex flex-col gap-4">
                {/* 카테고리 */}
                <div className="flex items-center gap-1.5">
                  {CATEGORY_ICON[descMeta.category] ?? <ClipboardList size={13} className="text-gray-400" />}
                  <span className="text-xs font-semibold text-text-tertiary">
                    {CATEGORY_LABEL[descMeta.category] ?? descMeta.category}
                  </span>
                </div>

                {/* 기능 설명 */}
                <div className="rounded-xl bg-surface-sunken p-4">
                  <p className="text-xs font-bold text-text-secondary mb-1.5">기능 설명</p>
                  <p className="text-sm text-text-primary leading-relaxed break-keep">
                    {desc.description}
                  </p>
                </div>

                {/* 사용 예시 */}
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-base leading-none">💡</span>
                    <p className="text-xs font-bold text-blue-600">이런 때 편리해요</p>
                  </div>
                  <p className="text-sm text-blue-900/80 leading-relaxed break-keep">
                    {desc.example}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">설명 정보가 없습니다.</p>
            )}
          </Modal>
        )
      })()}

      {/* ─── 무통장 입금 신청 모달 ────────────── */}
      <Modal
        open={paymentOpen}
        onClose={() => { if (!isSubmitting) setPaymentOpen(false) }}
        title={submitDone ? '신청 완료' : modalTitle}
        footer={
          submitDone ? (
            <Button fullWidth onClick={() => { setPaymentOpen(false); router.push('/business/profile') }}>
              확인
            </Button>
          ) : (
            <>
              <Button fullWidth onClick={handleSubmit} isLoading={isSubmitting}>
                신청하기
              </Button>
              <Button variant="ghost" fullWidth onClick={() => setPaymentOpen(false)} disabled={isSubmitting}>
                취소
              </Button>
            </>
          )
        }
      >
        {submitDone ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 size={44} className="text-state-success" />
            <p className="text-sm text-text-secondary leading-relaxed break-keep">
              신청이 접수되었습니다.<br />
              입금 확인 후 영업일 기준 1일 이내 플랜이 반영됩니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-surface-sunken p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-tertiary">은행</span>
                <span className="font-medium text-text-primary">국민은행</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">계좌번호</span>
                <span className="font-medium text-text-primary">123-456-789012</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">예금주</span>
                <span className="font-medium text-text-primary">범빌드코리아</span>
              </div>
              <div className="flex justify-between border-t border-border-subtle pt-2 mt-1">
                <span className="text-text-tertiary">입금 금액</span>
                <span className="font-bold text-brand-600">
                  {selectedPlan ? getPaymentAmount(selectedPlan).toLocaleString('ko-KR') : 0}원
                </span>
              </div>
            </div>

            {selectedStyle && (
              <div className={`flex items-center gap-3 rounded-xl p-3 ${selectedStyle.accentBg}`}>
                {selectedStyle.icon}
                <div>
                  <p className={`text-sm font-bold ${selectedStyle.accent}`}>{selectedPlan ? PLAN_NAMES[selectedPlan] : ''} 플랜</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {billingCycle === 'annual'
                      ? `연간 ${selectedPlan ? getPaymentAmount(selectedPlan).toLocaleString('ko-KR') : 0}원 (월 ${selectedPlan ? getMonthlyEquivalent(selectedPlan).toLocaleString('ko-KR') : 0}원)`
                      : `월 ${selectedPlan ? PLAN_PRICES[selectedPlan].toLocaleString('ko-KR') : 0}원 · 30일`
                    }
                  </p>
                </div>
              </div>
            )}

            {requestType === 'upgrade' && currentPlan !== 'free' && remainingDays > 0 && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3">
                <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
                <p className="text-xs text-amber-700 leading-normal">
                  현재 플랜({PLAN_NAMES[currentPlan]})의 남은 기간 {remainingDays}일이 소멸됩니다.
                  확인 즉시 새로운 30일이 시작됩니다.
                </p>
              </div>
            )}

            {requestType === 'renewal' && expiresAt && (
              <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3">
                <span className="text-blue-500 text-base leading-none mt-0.5">📅</span>
                <p className="text-xs text-blue-700 leading-normal">
                  현재 만료일({formatKoreanDate(expiresAt)})에서 30일 연장됩니다.
                  → {getNewExpiryLabel(expiresAt)}까지
                </p>
              </div>
            )}

            {requestType === 'downgrade' && expiresAt && (
              <div className="flex items-start gap-2 rounded-xl bg-orange-50 border border-orange-100 p-3">
                <span className="text-orange-500 text-base leading-none mt-0.5">ℹ️</span>
                <p className="text-xs text-orange-700 leading-normal">
                  현재 플랜 만료일({formatKoreanDate(expiresAt)}) 이후 적용됩니다.
                  만료일까지 현재 {PLAN_NAMES[currentPlan]} 플랜이 유지됩니다.
                </p>
              </div>
            )}

            <HelpTip>입금자명은 입금 시 사용하신 이름과 동일하게 입력해주세요.</HelpTip>

            <Input
              label="입금자명"
              placeholder="입금 시 사용한 이름"
              value={depositorName}
              onChange={e => { setDepositorName(e.target.value); setError(null) }}
              name="depositor_name"
            />

            {error && <p className="text-sm text-state-danger">{error}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
