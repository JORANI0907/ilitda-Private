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

// 핵심 기능 키 — ★ 표시 대상
const KEY_FEATURE_KEYS = new Set([
  'workers', 'payroll', 'revenue', 'quotations', 'contracts',
  'sms_auto_dispatch', 'application_limit', 'marketplace', 'app_name_custom',
])

// DB에 등록되지 않은 기능을 위한 fallback 메타데이터
const FEATURE_META_FALLBACK: FeatureMeta[] = [
  { feature_key: 'application_limit',   label: '신청서 목록 한도',    category: 'feature',  feature_type: 'numeric'  },
  { feature_key: 'sms_daily_limit',     label: '일일 SMS 발송 한도',  category: 'sms',      feature_type: 'numeric'  },
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
        body: JSON.stringify({ plan_name: selectedPlan, depositor_name: depositorName.trim() }),
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
                const isKey  = KEY_FEATURE_KEYS.has(item.feature_key)
                const numVal = item.feature_type === 'numeric' ? f?.free?.[item.feature_key] : null
                return (
                  <div
                    key={item.feature_key}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                      isKey
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-surface-sunken border-border-subtle'
                    }`}
                  >
                    {isKey && (
                      <span className="text-[10px] font-black text-amber-500 leading-none">★</span>
                    )}
                    {CATEGORY_ICON[item.category] ?? <ClipboardList size={13} className="text-gray-400" />}
                    <span className="text-xs text-text-secondary break-keep">{item.label}</span>
                    {numVal !== null && numVal !== undefined && (
                      <span className="text-[11px] font-bold text-state-success ml-0.5">
                        {formatLimit(numVal)}
                      </span>
                    )}
                  </div>
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
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-xs font-black text-text-primary leading-none">
                          {PLAN_PRICES[k].toLocaleString('ko-KR')}
                        </span>
                        <span className="text-[9px] text-text-tertiary">원</span>
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
                    const isKey  = KEY_FEATURE_KEYS.has(item.feature_key)
                    return (
                      <div
                        key={item.feature_key}
                        className={`grid items-center ${!isLast ? 'border-b border-border-subtle' : ''} ${isKey ? 'bg-amber-50/50' : ''}`}
                        style={{ gridTemplateColumns: '2fr repeat(4, 1fr)' }}
                      >
                        {/* 기능명 */}
                        <div className="px-3 py-3">
                          <div className="flex items-start gap-1.5">
                            {isKey && (
                              <span className="shrink-0 text-[11px] font-black text-amber-500 leading-none mt-0.5">★</span>
                            )}
                            <span className={`text-xs leading-snug break-keep ${isKey ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                              {item.label}
                            </span>
                          </div>
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
                    {PLAN_PRICES[k].toLocaleString('ko-KR')}원
                  </span>
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
                  {selectedPlan ? PLAN_PRICES[selectedPlan].toLocaleString('ko-KR') : 0}원
                </span>
              </div>
            </div>

            {selectedStyle && (
              <div className={`flex items-center gap-3 rounded-xl p-3 ${selectedStyle.accentBg}`}>
                {selectedStyle.icon}
                <div>
                  <p className={`text-sm font-bold ${selectedStyle.accent}`}>{selectedPlan ? PLAN_NAMES[selectedPlan] : ''} 플랜</p>
                  <p className="text-xs text-text-secondary mt-0.5">월 {selectedPlan ? PLAN_PRICES[selectedPlan].toLocaleString('ko-KR') : 0}원 · 30일</p>
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
