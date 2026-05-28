'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Check, Minus, CheckCircle2,
  MessageSquare, ClipboardList, Users,
  Crown, Zap, Star, Settings, Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { HelpTip } from '@/components/ui/HelpTip'
import { PLAN_NAMES, PLAN_PRICES, toPlanType } from '@/lib/plan-features'
import type { PlanType } from '@/lib/plan-features'
import { usePlanFeatures } from '@/contexts/PlanFeaturesContext'
import type { FeatureMeta } from '@/contexts/PlanFeaturesContext'

const PLAN_KEYS: Exclude<PlanType, 'free'>[] = ['basic', 'pro', 'max']

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

// 플랜 설명 및 추천 대상 (정적 문구 — 관리자 플랜 구성과 독립적으로 유지)
const PLAN_DESC: Record<string, { tagline: string; target: string }> = {
  basic: {
    tagline: '팀 관리의 첫 시작, 핵심만 담았습니다',
    target: '소규모 팀·1인 사업자가 처음 시작하기에 적합',
  },
  pro: {
    tagline: '무제한 신청서 + 견적서까지 완전 운영',
    target: '빠르게 성장 중인 팀, 견적이 잦은 업종 추천',
  },
  max: {
    tagline: '계약서·앱 커스텀까지 모든 기능 완전 해제',
    target: '계약 관리 필요, 나만의 브랜드 앱을 원하는 분',
  },
}

// 핵심 기능 키 집합 — ★ 표시 대상
const KEY_FEATURE_KEYS = new Set([
  'workers',
  'payroll',
  'revenue',
  'quotations',
  'contracts',
  'sms_auto_dispatch',
  'application_limit',
  'marketplace',
  'app_name_custom',
])

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
    const isUnlimited = label === '무제한'
    if (isUnlimited) {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-base font-black text-state-success leading-none">∞</span>
          <span className="text-[9px] text-state-success/70 font-medium">무제한</span>
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xs font-bold text-text-primary leading-none">{label}</span>
      </div>
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

interface DynamicCategory {
  category: string
  items: FeatureMeta[]
}

function buildCategories(meta: FeatureMeta[]): DynamicCategory[] {
  const map = new Map<string, FeatureMeta[]>()
  for (const item of meta) {
    if (!map.has(item.category)) map.set(item.category, [])
    map.get(item.category)!.push(item)
  }
  return CATEGORY_ORDER
    .filter(cat => map.has(cat))
    .map(cat => ({ category: cat, items: map.get(cat)! }))
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

  const dynamicCategories = useMemo(() => buildCategories(meta), [meta])
  const f = features as Record<string, Record<string, unknown>> | null

  const selectedStyle = selectedPlan ? PLAN_STYLE[selectedPlan] : null
  const remainingDays = getRemainingDays(expiresAt)

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

      {/* 현재 플랜 상태 */}
      <div className="rounded-2xl p-4 border border-border bg-surface">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-tertiary mb-0.5">현재 플랜</p>
            {isLoading ? (
              <div className="h-6 w-24 rounded bg-surface-sunken animate-pulse" />
            ) : (
              <p className="text-lg font-bold text-text-primary">
                {PLAN_NAMES[currentPlan]}
                {currentPlan !== 'free' && (
                  <span className="ml-2 text-xs font-normal text-text-tertiary">
                    {PLAN_PRICES[currentPlan].toLocaleString('ko-KR')}원/월
                  </span>
                )}
              </p>
            )}
            {expiresAt && (
              <p className="text-xs text-text-tertiary mt-1">만료일: {expiresAt.slice(0, 10)}</p>
            )}
          </div>
          {currentPlan !== 'free' && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PLAN_STYLE[currentPlan]?.badge}`}>
              {PLAN_NAMES[currentPlan]}
            </span>
          )}
        </div>
      </div>

      <HelpTip>플랜 카드를 탭해 업그레이드·갱신·하향 신청을 할 수 있습니다. 입금 확인 후 영업일 기준 1일 이내 반영됩니다.</HelpTip>

      {/* ─── 플랜 카드 3개 ─────────────────────── */}
      <div className="flex flex-col gap-3">
        {PLAN_KEYS.map(key => {
          const style     = PLAN_STYLE[key]
          const isCurrent = key === currentPlan
          const isLower   = (PLAN_ORDER[key] ?? 0) < (PLAN_ORDER[currentPlan] ?? 0)

          // 이 플랜에서 활성화된 기능 목록 (카테고리별 그룹)
          const enabledByCategory = CATEGORY_ORDER
            .map(cat => ({
              cat,
              items: meta.filter(m => {
                if (m.category !== cat) return false
                const v = f?.[key]?.[m.feature_key]
                if (m.feature_type === 'numeric') return typeof v === 'number' && v > 0
                return v === true
              }),
            }))
            .filter(g => g.items.length > 0)

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              className={`text-left rounded-2xl border-2 overflow-hidden transition-all active:scale-[0.98] relative ${
                isCurrent
                  ? `${style.activeBorder} ${style.activeBg}`
                  : `${style.border} bg-surface hover:${style.activeBorder} hover:shadow-soft`
              }`}
            >
              {style.tag && (
                <span className="absolute -top-px right-4 px-2.5 py-0.5 rounded-b-full text-[10px] font-bold bg-violet-500 text-white">
                  {style.tag}
                </span>
              )}

              {/* 플랜 헤더 */}
              <div className={`px-4 pt-4 pb-3 ${isCurrent ? '' : style.headerBg}`}>
                {/* 플랜명 + 가격 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {style.icon}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-extrabold text-base leading-tight ${style.accent}`}>{PLAN_NAMES[key]}</span>
                        {isCurrent && (
                          <span className="text-[9px] font-bold text-white bg-state-success px-1.5 py-0.5 rounded-full">현재</span>
                        )}
                        {isLower && !isCurrent && (
                          <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">하향</span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-tertiary leading-snug mt-0.5 break-keep">
                        {PLAN_DESC[key]?.tagline}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-baseline gap-0.5 justify-end">
                      <span className="text-2xl font-black text-text-primary leading-none">
                        {PLAN_PRICES[key].toLocaleString('ko-KR')}
                      </span>
                      <span className="text-xs text-text-tertiary">원</span>
                    </div>
                    <p className="text-[10px] text-text-tertiary text-right">/ 월</p>
                  </div>
                </div>
                {/* 추천 대상 */}
                <div className={`mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl ${style.accentBg}`}>
                  <span className="text-xs leading-none">👤</span>
                  <span className={`text-[11px] font-medium leading-snug break-keep ${style.accent}`}>
                    {PLAN_DESC[key]?.target}
                  </span>
                </div>
              </div>

              {/* 활성화된 기능 목록 */}
              {enabledByCategory.length > 0 && (
                <div className="px-4 py-3 flex flex-col gap-2.5 border-t border-border-subtle">
                  {enabledByCategory.map(({ cat, items }) => (
                    <div key={cat}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {CATEGORY_ICON[cat]}
                        <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide">
                          {CATEGORY_LABEL[cat] ?? cat}
                        </span>
                      </div>
                      <ul className="flex flex-col gap-1.5">
                        {items.map(m => {
                          const isKey = KEY_FEATURE_KEYS.has(m.feature_key)
                          return (
                            <li key={m.feature_key} className="flex items-start gap-2">
                              {isKey ? (
                                <span className="shrink-0 text-[11px] font-black text-amber-500 mt-0.5 leading-none">★</span>
                              ) : (
                                <Check size={11} className={`shrink-0 ${style.accent} mt-0.5`} />
                              )}
                              <span className={`text-xs break-keep leading-snug ${isKey ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                                {m.label}
                                {isKey && (
                                  <span className="ml-1.5 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                    핵심
                                  </span>
                                )}
                                {m.feature_type === 'numeric' && (
                                  <span className={`ml-1 font-semibold ${style.accent}`}>
                                    ({formatLimit(f?.[key]?.[m.feature_key])})
                                  </span>
                                )}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* 스켈레톤 (meta 로딩 중) */}
              {meta.length === 0 && (
                <div className="px-4 py-3 border-t border-border-subtle flex flex-col gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-4 rounded bg-surface-sunken animate-pulse w-3/4" />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* ─── 기능 비교표 ───────────────────────── */}
      <div className="flex flex-col gap-3 mt-1">
        <SectionHeader title="플랜별 기능 비교" level="section" />

        <div className="rounded-2xl border border-border overflow-hidden bg-white shadow-soft">

          {/* ── 컬럼 헤더 (sticky) ── */}
          <div className="grid grid-cols-4 sticky top-0 z-10 bg-white border-b-2 border-border shadow-pop">
            {/* 빈 첫 번째 칸 */}
            <div className="px-3 py-4 flex items-end pb-3">
              <span className="text-[10px] font-semibold text-text-tertiary tracking-widest uppercase">기능</span>
            </div>

            {PLAN_KEYS.map(k => {
              const s = PLAN_STYLE[k]
              const isCur = currentPlan === k
              return (
                <div
                  key={k}
                  className={`relative border-l border-border flex flex-col items-center pt-3 pb-3 gap-1 ${isCur ? s.colBg : ''}`}
                >
                  {/* 상단 컬러 바 */}
                  <div className={`absolute top-0 left-0 right-0 h-[3px] ${s.topBar}`} />

                  {/* 인기 태그 */}
                  {s.tag && (
                    <span className="absolute -top-px right-2 text-[9px] font-black text-white bg-violet-500 px-2 py-0.5 rounded-b-md tracking-wide">
                      {s.tag}
                    </span>
                  )}

                  {/* 아이콘 */}
                  <span>{s.iconLg}</span>

                  {/* 플랜명 */}
                  <p className={`text-sm font-extrabold leading-tight ${s.accent}`}>
                    {PLAN_NAMES[k]}
                  </p>

                  {/* 가격 */}
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-base font-black text-text-primary leading-none">
                      {PLAN_PRICES[k].toLocaleString('ko-KR')}
                    </span>
                    <span className="text-[10px] text-text-tertiary">원</span>
                  </div>
                  <span className="text-[10px] text-text-tertiary -mt-0.5">/ 월</span>

                  {/* 현재 플랜 뱃지 */}
                  {isCur && (
                    <span className="mt-0.5 text-[9px] font-bold text-white bg-state-success px-2.5 py-0.5 rounded-full">
                      현재 플랜
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── 카테고리별 섹션 ── */}
          {dynamicCategories.map((cat, catIdx) => (
            <div key={cat.category}>
              {/* 카테고리 구분 행 */}
              <div className={`grid grid-cols-4 ${catIdx > 0 ? 'border-t-2 border-border' : ''}`}>
                <div className={`col-span-4 flex items-center gap-2 px-3 py-2.5 bg-surface-sunken`}>
                  <div className="flex items-center gap-2">
                    {CATEGORY_ICON[cat.category] ?? <ClipboardList size={13} className="text-gray-400" />}
                    <span className="text-xs font-bold text-text-secondary">
                      {CATEGORY_LABEL[cat.category] ?? cat.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* 기능 행 */}
              {cat.items.map((item, i) => {
                const isLast = i === cat.items.length - 1
                const isKey  = KEY_FEATURE_KEYS.has(item.feature_key)
                return (
                  <div
                    key={item.feature_key}
                    className={`grid grid-cols-4 items-center ${!isLast ? 'border-b border-border-subtle' : ''} ${isKey ? 'bg-amber-50/50' : ''}`}
                  >
                    {/* 기능명 */}
                    <div className="px-3 py-3.5">
                      <div className="flex items-start gap-1.5">
                        {isKey && (
                          <span className="shrink-0 text-[11px] font-black text-amber-500 leading-none mt-0.5">★</span>
                        )}
                        <span className={`text-xs leading-snug break-keep ${isKey ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                          {item.label}
                        </span>
                      </div>
                    </div>

                    {/* 플랜별 셀 */}
                    {PLAN_KEYS.map(plan => {
                      const isCur = currentPlan === plan
                      return (
                        <div
                          key={plan}
                          className={`py-3.5 flex justify-center items-center border-l border-border-subtle ${
                            isCur ? PLAN_STYLE[plan].colBg : ''
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
          {dynamicCategories.length === 0 && (
            <div className="flex flex-col gap-2 p-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 rounded bg-surface-sunken animate-pulse" />
              ))}
            </div>
          )}
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
