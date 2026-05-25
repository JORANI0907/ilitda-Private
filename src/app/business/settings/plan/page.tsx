'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Check, Minus, CheckCircle2,
  MessageSquare, ClipboardList, Users, Settings, Globe,
  Crown, Zap, Star,
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

// ─── 플랜 정의 ────────────────────────────────────────────────
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

// ─── 카테고리 아이콘/이름 (DB 기반 category 값 → UI) ──────────
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  sms:      <MessageSquare size={14} className="text-blue-500" />,
  feature:  <ClipboardList size={14} className="text-green-500" />,
  hr:       <Users size={14} className="text-violet-500" />,
  settings: <Settings size={14} className="text-gray-500" />,
  business: <Globe size={14} className="text-teal-500" />,
}

const CATEGORY_LABEL: Record<string, string> = {
  sms:      'SMS 알림',
  feature:  '서비스 관리',
  hr:       '직원 · HR',
  settings: '설정 · 커스텀',
  business: '비즈니스 확장',
}

const CATEGORY_ORDER = ['sms', 'feature', 'hr', 'settings', 'business']

// ─── 플랜 카드 스타일 ─────────────────────────────────────────
const PLAN_STYLE: Record<string, {
  badge: string
  border: string
  activeBorder: string
  activeBg: string
  icon: React.ReactNode
  accent: string
  tag?: string
}> = {
  basic: {
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-border',
    activeBorder: 'border-blue-500',
    activeBg: 'bg-blue-50',
    icon: <Star size={16} className="text-blue-500" />,
    accent: 'text-blue-600',
  },
  pro: {
    badge: 'bg-violet-100 text-violet-700',
    border: 'border-border',
    activeBorder: 'border-violet-500',
    activeBg: 'bg-violet-50',
    icon: <Zap size={16} className="text-violet-500" />,
    accent: 'text-violet-600',
    tag: '인기',
  },
  max: {
    badge: 'bg-amber-100 text-amber-700',
    border: 'border-border',
    activeBorder: 'border-amber-500',
    activeBg: 'bg-amber-50',
    icon: <Crown size={16} className="text-amber-500" />,
    accent: 'text-amber-600',
  },
}

// ─── 숫자 한도 포맷팅 ─────────────────────────────────────────
function formatLimit(val: unknown): string {
  if (val === true) return ''
  if (val === false) return ''
  if (val === Infinity || val === null || val === undefined) return '무제한'
  const n = Number(val)
  if (!isFinite(n)) return '무제한'
  return `${n.toLocaleString('ko-KR')}건`
}

// ─── 셀 렌더 ─────────────────────────────────────────────────
function FeatureCell({
  featureType, value, isHighlight,
}: {
  featureType: 'boolean' | 'numeric'
  value: unknown
  isHighlight: boolean
}) {
  if (featureType === 'numeric') {
    const label = formatLimit(value)
    return (
      <span className={`text-xs font-bold leading-tight text-center ${isHighlight ? 'text-brand-600' : 'text-text-secondary'}`}>
        {label}
      </span>
    )
  }
  if (value === true) {
    return <Check size={16} strokeWidth={2.5} className="text-state-success mx-auto" />
  }
  return <Minus size={14} className="text-border-strong mx-auto opacity-40" />
}

// ─── 동적 카테고리 빌더 ───────────────────────────────────────
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

// highlight 판별: basic/pro/max 간 값이 하나라도 다르면 highlight
function isHighlight(
  meta: FeatureMeta,
  features: Record<string, Record<string, unknown>>,
): boolean {
  const vals = PLAN_KEYS.map(p => features[p]?.[meta.feature_key])
  return vals.some(v => v !== vals[0])
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

  // ─── 동적 카테고리 계산 ──────────────────────────────────────
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

      {/* 플랜 카드 3개 */}
      <div className="flex flex-col gap-3">
        {PLAN_KEYS.map(key => {
          const style     = PLAN_STYLE[key]
          const isCurrent = key === currentPlan
          const isLower   = (PLAN_ORDER[key] ?? 0) < (PLAN_ORDER[currentPlan] ?? 0)

          // highlight 항목 중 이 플랜에서 활성화된 것만 bullet 표시
          const bulletItems = f
            ? meta.filter(m => isHighlight(m, f)).filter(m => {
                const v = f[key]?.[m.feature_key]
                return v !== false && v !== 0 && v !== null && v !== undefined
              })
            : []

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              className={`text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98] relative ${
                isCurrent
                  ? `${style.activeBorder} ${style.activeBg}`
                  : `${style.border} bg-surface hover:${style.activeBorder} hover:shadow-soft`
              }`}
            >
              {style.tag && (
                <span className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500 text-white">
                  {style.tag}
                </span>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {style.icon}
                  <span className={`font-bold text-[15px] ${style.accent}`}>{PLAN_NAMES[key]}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-semibold text-white bg-gray-400 px-2 py-0.5 rounded-full">현재</span>
                  )}
                  {isLower && !isCurrent && (
                    <span className="text-[10px] font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">하향</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-text-primary">
                    {PLAN_PRICES[key].toLocaleString('ko-KR')}
                  </span>
                  <span className="text-xs text-text-tertiary">원/월</span>
                </div>
              </div>

              {/* 주요 기능 bullet (highlight 항목) */}
              {bulletItems.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {bulletItems.map(m => (
                    <li key={m.feature_key} className="flex items-center gap-2">
                      <Check size={12} className={`shrink-0 ${style.accent}`} />
                      <span className="text-xs text-text-secondary">
                        {m.label}
                        {m.feature_type === 'numeric' && ` (${formatLimit(f?.[key]?.[m.feature_key])})`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </button>
          )
        })}
      </div>

      {/* 기능 비교표 */}
      <div className="flex flex-col gap-3 mt-2">
        <SectionHeader title="기능 상세 비교" level="section" />

        <div className="rounded-2xl border border-border overflow-hidden bg-white">
          {/* 컬럼 헤더 */}
          <div className="grid grid-cols-4 bg-surface-sunken border-b-2 border-border">
            <div className="px-3 py-3" />
            {PLAN_KEYS.map(k => (
              <div key={k} className="py-3 text-center border-l border-border">
                <p className={`text-xs font-bold ${PLAN_STYLE[k].accent}`}>{PLAN_NAMES[k]}</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  {PLAN_PRICES[k].toLocaleString('ko-KR')}원
                </p>
              </div>
            ))}
          </div>

          {/* 카테고리별 섹션 (DB 기반 동적 렌더링) */}
          {dynamicCategories.map((cat, catIdx) => (
            <div key={cat.category}>
              <div className={`flex items-center gap-2 px-3 py-2.5 bg-surface-sunken/70 ${catIdx > 0 ? 'border-t-2 border-border' : ''}`}>
                {CATEGORY_ICON[cat.category] ?? <ClipboardList size={14} className="text-gray-400" />}
                <span className="text-xs font-bold text-text-secondary">
                  {CATEGORY_LABEL[cat.category] ?? cat.category}
                </span>
              </div>

              {cat.items.map((item, i) => {
                const highlight = f ? isHighlight(item, f) : false
                return (
                  <div
                    key={item.feature_key}
                    className={`grid grid-cols-4 items-center ${
                      i < cat.items.length - 1 ? 'border-b border-border-subtle' : ''
                    } ${highlight ? 'bg-brand-50/40' : ''}`}
                  >
                    <div className="px-3 py-3.5">
                      <span className={`text-xs leading-snug break-keep ${highlight ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>
                        {item.label}
                      </span>
                    </div>
                    {PLAN_KEYS.map(plan => (
                      <div key={plan} className="py-3.5 flex justify-center items-center border-l border-border-subtle">
                        <FeatureCell
                          featureType={item.feature_type}
                          value={f?.[plan]?.[item.feature_key]}
                          isHighlight={highlight}
                        />
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}

          {/* meta가 아직 로딩 중일 때 스켈레톤 */}
          {dynamicCategories.length === 0 && (
            <div className="flex flex-col gap-2 p-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 rounded bg-surface-sunken animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 무통장 입금 신청 모달 */}
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
