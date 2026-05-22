'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Check, X, Minus, CheckCircle2,
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

// ─── 플랜 정의 ────────────────────────────────────────────────
const PLAN_KEYS: Exclude<PlanType, 'free'>[] = ['basic', 'pro', 'max']

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

// ─── 기능 비교표 ───────────────────────────────────────────────
type FeatureValue = boolean | string

interface FeatureRow {
  label: string
  basic: FeatureValue
  pro: FeatureValue
  max: FeatureValue
  highlight?: boolean
}

interface FeatureCategory {
  icon: React.ReactNode
  title: string
  rows: FeatureRow[]
}

const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    icon: <MessageSquare size={14} className="text-blue-500" />,
    title: 'SMS 알림',
    rows: [
      { label: '수동 발송',   basic: true,      pro: true,      max: true },
      { label: '일일 한도',   basic: '50건',    pro: '무제한',  max: '무제한', highlight: true },
      { label: '자동 발송',   basic: false,     pro: true,      max: true,     highlight: true },
      { label: '커스텀 문구', basic: false,     pro: true,      max: true },
    ],
  },
  {
    icon: <ClipboardList size={14} className="text-green-500" />,
    title: '서비스 관리',
    rows: [
      { label: '신청서 관리',   basic: true, pro: true, max: true },
      { label: '캘린더뷰',      basic: true, pro: true, max: true },
      { label: '고객 폴더 생성', basic: true, pro: true, max: true },
      { label: '견적서 발행',   basic: true, pro: true, max: true },
    ],
  },
  {
    icon: <Users size={14} className="text-violet-500" />,
    title: '직원 · HR',
    rows: [
      { label: '직원 등록',   basic: '10명',    pro: '무제한',  max: '무제한', highlight: true },
      { label: '근태 관리',   basic: true,      pro: true,      max: true },
      { label: '급여 관리',   basic: true,      pro: true,      max: true },
      { label: '매출 관리',   basic: true,      pro: true,      max: true },
      { label: '재고 관리',   basic: false,     pro: true,      max: true,     highlight: true },
      { label: '계약서 관리', basic: false,     pro: false,     max: true,     highlight: true },
    ],
  },
  {
    icon: <Settings size={14} className="text-gray-500" />,
    title: '설정 · 커스텀',
    rows: [
      { label: '솔라피 연동',    basic: true,  pro: true,  max: true },
      { label: '앱 이름 커스텀', basic: false, pro: false, max: true, highlight: true },
    ],
  },
  {
    icon: <Globe size={14} className="text-teal-500" />,
    title: '비즈니스 확장',
    rows: [
      { label: '마켓플레이스', basic: false, pro: true, max: true, highlight: true },
    ],
  },
]

// ─── 셀 렌더 ─────────────────────────────────────────────────
function FeatureCell({ value, highlight }: { value: FeatureValue; highlight?: boolean }) {
  if (typeof value === 'string') {
    return (
      <span className={`text-[11px] font-semibold ${highlight ? 'text-brand-600' : 'text-text-secondary'}`}>
        {value}
      </span>
    )
  }
  if (value) {
    return <Check size={14} className="text-state-success mx-auto" />
  }
  return <X size={12} className="text-text-disabled mx-auto" />
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function PlanPage() {
  const router = useRouter()
  const [currentPlan, setCurrentPlan] = useState<PlanType>('free')
  const [expiresAt, setExpiresAt]     = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(true)

  const [selectedPlan, setSelectedPlan] = useState<Exclude<PlanType, 'free'> | null>(null)
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
    if (plan === currentPlan) return
    setSelectedPlan(plan)
    setPaymentOpen(true)
    setSubmitDone(false)
    setDepositorName('')
    setError(null)
  }

  async function handleSubmit() {
    if (!depositorName.trim()) {
      setError('입금자명을 입력해주세요.')
      return
    }
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

  const selectedStyle = selectedPlan ? PLAN_STYLE[selectedPlan] : null

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-24">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
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

      <HelpTip>플랜 카드를 탭하면 업그레이드를 신청할 수 있습니다. 입금 확인 후 영업일 기준 1일 이내 활성화됩니다.</HelpTip>

      {/* 플랜 카드 3개 */}
      <div className="flex flex-col gap-3">
        {PLAN_KEYS.map(key => {
          const style     = PLAN_STYLE[key]
          const isCurrent = key === currentPlan
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              disabled={isCurrent}
              className={`text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98] relative ${
                isCurrent
                  ? `${style.activeBorder} ${style.activeBg}`
                  : `${style.border} bg-surface hover:${style.activeBorder} hover:shadow-soft`
              }`}
            >
              {/* 인기 태그 */}
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
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-text-primary">
                    {PLAN_PRICES[key].toLocaleString('ko-KR')}
                  </span>
                  <span className="text-xs text-text-tertiary">원/월</span>
                </div>
              </div>

              {/* 주요 기능 요약 */}
              <ul className="flex flex-col gap-1.5">
                {FEATURE_CATEGORIES.map(cat =>
                  cat.rows
                    .filter(r => r.highlight)
                    .filter(r => {
                      const v = r[key]
                      return v !== false
                    })
                    .map(r => (
                      <li key={r.label} className="flex items-center gap-2">
                        <Check size={12} className={`shrink-0 ${style.accent}`} />
                        <span className="text-xs text-text-secondary">
                          {r.label}
                          {typeof r[key] === 'string' && ` (${r[key]})`}
                        </span>
                      </li>
                    ))
                )}
              </ul>
            </button>
          )
        })}
      </div>

      {/* 기능 비교표 */}
      <div className="flex flex-col gap-4 mt-2">
        <SectionHeader title="기능 상세 비교" level="section" />

        {/* 컬럼 헤더 */}
        <div className="grid grid-cols-4 gap-1 px-1">
          <div />
          {PLAN_KEYS.map(k => (
            <div key={k} className="text-center">
              <p className={`text-[11px] font-bold ${PLAN_STYLE[k].accent}`}>{PLAN_NAMES[k]}</p>
              <p className="text-[10px] text-text-tertiary">{(PLAN_PRICES[k] / 1000).toFixed(1)}K</p>
            </div>
          ))}
        </div>

        {FEATURE_CATEGORIES.map(cat => (
          <div key={cat.title} className="rounded-2xl border border-border-subtle overflow-hidden">
            {/* 카테고리 헤더 */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-sunken border-b border-border-subtle">
              {cat.icon}
              <span className="text-[12px] font-semibold text-text-secondary">{cat.title}</span>
            </div>

            {/* 기능 행 */}
            {cat.rows.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-4 items-center gap-1 px-3 py-2.5 ${
                  i < cat.rows.length - 1 ? 'border-b border-border-subtle' : ''
                } ${row.highlight ? 'bg-blue-50/40' : ''}`}
              >
                <span className={`text-[11px] ${row.highlight ? 'font-semibold text-text-primary' : 'text-text-secondary'} break-keep`}>
                  {row.label}
                </span>
                <div className="flex justify-center">
                  <FeatureCell value={row.basic} highlight={row.highlight} />
                </div>
                <div className="flex justify-center">
                  <FeatureCell value={row.pro} highlight={row.highlight} />
                </div>
                <div className="flex justify-center">
                  <FeatureCell value={row.max} highlight={row.highlight} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 무통장 입금 안내 모달 */}
      <Modal
        open={paymentOpen}
        onClose={() => { if (!isSubmitting) setPaymentOpen(false) }}
        title={submitDone ? '신청 완료' : `${selectedPlan ? PLAN_NAMES[selectedPlan] : ''} 플랜 신청`}
        footer={
          submitDone ? (
            <Button fullWidth onClick={() => { setPaymentOpen(false); router.back() }}>
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
              입금 확인 후 영업일 기준 1일 이내 플랜이 활성화됩니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 입금 계좌 */}
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

            <HelpTip>입금자명은 입금 시 사용하신 이름과 동일하게 입력해주세요. 확인 후 플랜이 활성화됩니다.</HelpTip>

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
