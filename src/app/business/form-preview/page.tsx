'use client'

import { useState, useContext } from 'react'
import Link from 'next/link'
import {
  User, Building2, PenLine, Shield, ArrowRight,
  CalendarCheck, LogIn, Send, X, Link2,
} from 'lucide-react'
import { DEFAULT_FORM_CONFIG } from '@/lib/settings-defaults'
import { AuthContext } from '@/contexts/AuthContext'

// ─── 폼 상태 ─────────────────────────────────────────────────
interface RequestForm {
  client_name: string
  client_phone: string
  client_address: string
  notes: string
  owner_name: string
  care_scope: string
  payment_method: string
  elevator: string
  parking: string
}

const INITIAL: RequestForm = {
  client_name: '', client_phone: '', client_address: '',
  notes: '', owner_name: '', care_scope: '',
  payment_method: '', elevator: '', parking: '',
}

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, '')
  if (d.length <= 3) return d
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-text-primary">
        {label}{required && <span className="text-state-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function inputCls() {
  return 'w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-sunken text-sm outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:bg-surface'
}

function OptionGroup({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              value === opt
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-border bg-surface-sunken text-text-secondary hover:border-border-strong'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </Field>
  )
}

// ─── 데모 제한 모달 ───────────────────────────────────────────
function DemoBlockModal({ isGuest, onClose }: { isGuest: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-2xl shadow-modal p-6 flex flex-col gap-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-text-tertiary hover:text-text-secondary"
        >
          <X size={18} />
        </button>
        <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center">
          <Send size={22} className="text-brand-600" />
        </div>
        <div>
          <p className="font-bold text-text-primary text-lg">
            {isGuest ? '데모 모드에서는 발송이 제한됩니다' : '이것은 미리보기 화면입니다'}
          </p>
          <p className="text-sm text-text-secondary mt-1 break-keep leading-relaxed">
            {isGuest
              ? '가입 후 신청서 링크를 고객에게 발송할 수 있습니다. 고객이 작성하면 내 일정 탭에 자동 저장됩니다.'
              : '실제 신청서 링크는 설정 > 신청서 폼에서 복사해 고객에게 전달하세요.'}
          </p>
        </div>
        {isGuest ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-text-secondary"
            >
              닫기
            </button>
            <Link
              href="/login/register"
              className="flex-1 h-11 rounded-xl bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-brand-700 transition-colors"
            >
              <LogIn size={14} />
              가입하기
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors"
          >
            확인
          </button>
        )}
      </div>
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function FormPreviewPage() {
  const auth = useContext(AuthContext)
  const isGuest = !auth?.isLoading && !auth?.user

  const [form, setForm] = useState<RequestForm>(INITIAL)
  const [showBlockModal, setShowBlockModal] = useState(false)

  const set = (key: keyof RequestForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const formConfig = DEFAULT_FORM_CONFIG

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-28">

      {/* 데모 배너 */}
      {isGuest && (
        <div className="flex items-center justify-between gap-3 bg-brand-50 border border-brand-200 rounded-2xl px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-700">데모 모드로 둘러보는 중이에요</p>
            <p className="text-xs text-brand-600 mt-0.5 break-keep">가입하면 나만의 신청서를 고객에게 발송할 수 있어요.</p>
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

      {/* 안내 배너 */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-4 flex flex-col gap-3">
        <p className="text-sm font-bold text-text-primary">신청서 폼 작동 방식</p>
        <div className="flex items-center gap-2 flex-wrap text-sm text-text-secondary">
          <span className="flex items-center gap-1 bg-brand-50 text-brand-700 px-2.5 py-1 rounded-lg font-medium text-xs">
            <Send size={12} />
            신청서 링크 고객에게 전송
          </span>
          <ArrowRight size={14} className="text-text-tertiary shrink-0" />
          <span className="flex items-center gap-1 bg-surface-sunken px-2.5 py-1 rounded-lg text-xs font-medium">
            고객이 폼 작성 완료
          </span>
          <ArrowRight size={14} className="text-text-tertiary shrink-0" />
          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-medium text-xs">
            <CalendarCheck size={12} />
            내 일정 탭에 자동 저장
          </span>
        </div>
        <p className="text-xs text-text-tertiary break-keep">
          아래는 고객이 실제로 보게 되는 신청서 폼 미리보기입니다.
          {isGuest ? ' 가입 후 신청서 링크를 설정에서 복사해 고객에게 공유하세요.' : ' 설정 > 신청서 폼에서 링크를 복사해 고객에게 공유하세요.'}
        </p>
        <Link
          href="/business/profile#request-link-section"
          className="self-start flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 active:scale-[0.97] px-3 py-2 rounded-lg transition-all"
        >
          <Link2 size={13} />
          신청서 링크 확인하기
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* 폼 섹션: 기본 정보 */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border-subtle">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
            <User size={15} className="text-brand-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">기본 정보</p>
            <p className="text-xs text-text-tertiary">고객 기본 정보</p>
          </div>
        </div>

        <Field label="업체명 / 이름" required>
          <input
            className={inputCls()}
            placeholder="예: 스타벅스 판교점"
            value={form.client_name}
            onChange={(e) => set('client_name')(e.target.value)}
          />
        </Field>
        <Field label="연락처" required>
          <input
            type="tel"
            className={inputCls()}
            placeholder="010-0000-0000"
            value={form.client_phone}
            onChange={(e) => set('client_phone')(formatPhone(e.target.value))}
            maxLength={13}
          />
        </Field>
        {formConfig.show_fields.owner_name && (
          <Field label="담당자명">
            <input
              className={inputCls()}
              placeholder="예: 홍길동"
              value={form.owner_name}
              onChange={(e) => set('owner_name')(e.target.value)}
            />
          </Field>
        )}
        <OptionGroup
          label="결제 방법"
          options={formConfig.payment_options}
          value={form.payment_method}
          onChange={set('payment_method')}
        />
      </div>

      {/* 폼 섹션: 서비스·현장 정보 */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border-subtle">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Building2 size={15} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">서비스 · 현장 정보</p>
            <p className="text-xs text-text-tertiary">케어 관련 정보</p>
          </div>
        </div>

        <Field label="주소" required>
          <input
            className={inputCls()}
            placeholder="예: 성남시 분당구 판교역로..."
            value={form.client_address}
            onChange={(e) => set('client_address')(e.target.value)}
          />
        </Field>
        {formConfig.show_fields.elevator && (
          <OptionGroup
            label="엘리베이터"
            options={['있음', '없음', '계단 전용']}
            value={form.elevator}
            onChange={set('elevator')}
          />
        )}
        {formConfig.show_fields.parking && (
          <OptionGroup
            label="주차"
            options={['가능', '불가', '유료 주차']}
            value={form.parking}
            onChange={set('parking')}
          />
        )}
        <Field label="서비스 내용" required>
          <textarea
            rows={3}
            className={`${inputCls()} resize-y`}
            placeholder="예: 주방 후드, 환풍기, 에어컨 실내기 3대"
            value={form.care_scope}
            onChange={(e) => set('care_scope')(e.target.value)}
          />
        </Field>
      </div>

      {/* 폼 섹션: 요청사항 */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border-subtle">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <PenLine size={15} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">요청사항</p>
            <p className="text-xs text-text-tertiary">추가 요청사항</p>
          </div>
        </div>
        <Field label="요청사항">
          <textarea
            rows={3}
            className={`${inputCls()} resize-y`}
            placeholder="특이사항, 추가 요청사항을 자유롭게 입력해주세요"
            value={form.notes}
            onChange={(e) => set('notes')(e.target.value)}
          />
        </Field>
      </div>

      {/* 폼 섹션: 동의사항 (읽기전용 UI) */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border-subtle">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Shield size={15} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">동의사항</p>
            <p className="text-xs text-text-tertiary">아래 항목에 동의해 주세요</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border-subtle bg-surface-sunken opacity-60">
          <input type="checkbox" disabled className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm text-text-secondary">개인정보 수집·이용 동의 <span className="text-state-danger">*</span></p>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border-subtle bg-surface-sunken opacity-60">
          <input type="checkbox" disabled className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm text-text-secondary">서비스 마케팅 활용 동의 <span className="text-state-danger">*</span></p>
        </div>
      </div>

      {/* 제출 버튼 */}
      <button
        type="button"
        onClick={() => setShowBlockModal(true)}
        className="w-full py-4 rounded-2xl text-white text-base font-black flex items-center justify-center gap-2 transition-all bg-brand-600 hover:bg-brand-700 active:scale-[0.98] shadow-soft"
      >
        <Send size={18} />
        신청하기
      </button>

      {/* 데모 제한 모달 */}
      {showBlockModal && (
        <DemoBlockModal
          isGuest={isGuest}
          onClose={() => setShowBlockModal(false)}
        />
      )}
    </div>
  )
}
