import { BookOpen, CreditCard, ArrowUpCircle, RefreshCw, ArrowDownCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card } from '@/components/ui/Card'

// ─── 정책 데이터 ────────────────────────────────────────────────

const PLAN_PRICES = [
  { plan: 'Free',  price: '0원',       color: 'bg-surface-sunken text-text-secondary border border-border' },
  { plan: 'Basic', price: '9,900원/월', color: 'bg-blue-100 text-blue-700' },
  { plan: 'Pro',   price: '14,900원/월',color: 'bg-violet-100 text-violet-700' },
  { plan: 'Max',   price: '25,000원/월',color: 'bg-amber-100 text-amber-700' },
]

const REQUEST_TYPES = [
  {
    icon: <ArrowUpCircle size={18} className="text-green-600 shrink-0 mt-0.5" />,
    type: '업그레이드',
    badgeClass: 'bg-green-100 text-green-700',
    condition: '신청 플랜 > 현재 플랜',
    expiryRule: '확인일 + 30일',
    note: '기존 남은 기간 소멸. 확인 즉시 새 기간 시작.',
    customerNotice: '남은 N일 소멸 경고 모달 표시',
    adminAction: '입금 확인 즉시 처리',
  },
  {
    icon: <RefreshCw size={18} className="text-blue-600 shrink-0 mt-0.5" />,
    type: '갱신',
    badgeClass: 'bg-blue-100 text-blue-700',
    condition: '신청 플랜 = 현재 플랜',
    expiryRule: '현재 만료일 + 30일 (이미 만료 시 확인일 + 30일)',
    note: '기존 기간을 보존하여 연장. 만료일 미경과 시 기간 누적 가능.',
    customerNotice: '연장 후 만료일 미리보기 표시',
    adminAction: '입금 확인 즉시 처리',
  },
  {
    icon: <ArrowDownCircle size={18} className="text-orange-600 shrink-0 mt-0.5" />,
    type: '하향',
    badgeClass: 'bg-orange-100 text-orange-700',
    condition: '신청 플랜 < 현재 플랜',
    expiryRule: '확인일 + 30일',
    note: '현재 플랜 만료 후 적용이 원칙. 관리자가 만료일 이후에 수동으로 확인 처리.',
    customerNotice: '현재 플랜 만료일까지 현재 플랜 유지 안내',
    adminAction: '⚠️ 현재 플랜 만료일 이후에 처리할 것',
  },
]

const PROCESSING_STEPS = [
  { step: '1', desc: '고객이 플랜 페이지에서 원하는 플랜 선택 후 입금자명 입력하여 신청' },
  { step: '2', desc: '무통장 입금 — 국민은행 123-456-789012 (예금주: 범빌드코리아)' },
  { step: '3', desc: '관리자가 실제 입금 확인 (입금자명 대조)' },
  { step: '4', desc: '입금 관리 페이지에서 해당 신청 건 "확인" 버튼 클릭' },
  { step: '5', desc: '플랜 자동 업데이트 + Slack 알림 발송' },
]

const CAUTIONS = [
  '하향 신청은 반드시 현재 플랜 만료일 이후에 확인 처리하세요. 카드에 ⚠️ 표시가 있는 건은 하향 신청입니다.',
  '업그레이드 확인 시 고객의 남은 기간이 소멸됩니다. 이미 안내된 정책이지만 신중히 처리하세요.',
  '입금자명이 다를 경우 즉시 처리하지 말고 고객에게 확인 후 처리하세요.',
  '갱신 처리 시 DB의 현재 만료일 기준으로 자동 계산됩니다. 별도 날짜 입력 불필요.',
  'Slack 알림이 발송되지 않아도 DB는 정상 업데이트됩니다. Slack 미발송은 무시하세요.',
]

// ─── 페이지 ────────────────────────────────────────────────────

export default function AdminPolicyPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-24">
      <div className="flex items-center gap-3">
        <BookOpen size={22} className="text-brand-600 shrink-0" />
        <SectionHeader title="운영 정책" description="플랜 결제 및 처리 기준" level="page" />
      </div>

      {/* 플랜 가격 */}
      <section className="flex flex-col gap-3">
        <SectionHeader title="플랜 가격" level="section" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PLAN_PRICES.map(({ plan, price, color }) => (
            <Card key={plan} padding="md">
              <div className="flex flex-col gap-2 items-center text-center">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
                  {plan}
                </span>
                <p className="text-sm font-bold text-text-primary">{price}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 신청 유형별 처리 정책 */}
      <section className="flex flex-col gap-3">
        <SectionHeader title="신청 유형별 처리 정책" level="section" />
        <div className="flex flex-col gap-3">
          {REQUEST_TYPES.map((rt) => (
            <Card key={rt.type} padding="md">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  {rt.icon}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${rt.badgeClass}`}>
                    {rt.type}
                  </span>
                  <span className="text-xs text-text-tertiary">{rt.condition}</span>
                </div>

                <div className="flex flex-col gap-1.5 text-sm pl-1">
                  <div className="flex gap-2">
                    <span className="text-text-tertiary shrink-0 w-16 text-xs pt-0.5">만료일</span>
                    <span className="text-text-primary font-medium">{rt.expiryRule}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-text-tertiary shrink-0 w-16 text-xs pt-0.5">고객 안내</span>
                    <span className="text-text-secondary">{rt.customerNotice}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-text-tertiary shrink-0 w-16 text-xs pt-0.5">처리</span>
                    <span className={`font-medium ${rt.type === '하향' ? 'text-orange-600' : 'text-text-primary'}`}>
                      {rt.adminAction}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-text-tertiary bg-surface-sunken rounded-lg px-3 py-2 leading-relaxed">
                  {rt.note}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 처리 절차 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-text-tertiary" />
          <SectionHeader title="무통장 입금 처리 절차" level="section" />
        </div>
        <Card padding="md">
          <div className="flex flex-col gap-3">
            {PROCESSING_STEPS.map(({ step, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step}
                </span>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* 주의사항 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-state-warning" />
          <SectionHeader title="주의사항" level="section" />
        </div>
        <Card padding="md">
          <div className="flex flex-col gap-3">
            {CAUTIONS.map((caution, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-state-warning shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary leading-relaxed">{caution}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* 입금 계좌 */}
      <section className="flex flex-col gap-3">
        <SectionHeader title="입금 계좌 정보" level="section" />
        <Card padding="md">
          <div className="flex flex-col gap-2 text-sm">
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
          </div>
        </Card>
      </section>
    </div>
  )
}
