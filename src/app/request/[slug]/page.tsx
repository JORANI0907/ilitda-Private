'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { CheckCircle, User, Building2, PenLine, Shield } from 'lucide-react'
import { DEFAULT_FORM_CONFIG } from '@/lib/settings-defaults'
import type { FormConfig } from '@/types'

interface PageProps {
  params: Promise<{ slug: string }>
}

interface RequestForm {
  client_name: string
  client_phone: string
  client_address: string
  desired_date: string
  desired_time: string
  notes: string
  owner_name: string
  email: string
  business_number: string
  account_number: string
  payment_method: string
  elevator: string
  parking: string
  building_access: string
  access_method: string
  care_scope: string
}

const INITIAL_FORM: RequestForm = {
  client_name: '', client_phone: '', client_address: '',
  desired_date: '', desired_time: '', notes: '',
  owner_name: '', email: '', business_number: '',
  account_number: '', payment_method: '',
  elevator: '', parking: '', building_access: '',
  access_method: '', care_scope: '',
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

const PRIVACY_TEXT = `■ 개인정보 수집·이용에 관한 안내

수집 항목
• 업체명/이름, 담당자명, 연락처, 이메일
• 사업자번호, 주소, 희망 방문 일시
• 청소 범위, 요청사항 등 서비스 신청 관련 정보

수집 목적
서비스 신청 접수 및 처리, 견적 안내, 담당자 연락

보유 기간
서비스 신청일로부터 3년
(단, 관련 법령에 따라 보유 기간이 달라질 수 있습니다)

귀하는 개인정보 수집·이용에 동의를 거부할 권리가 있습니다.
단, 동의 거부 시 서비스 신청이 불가합니다.`

const MARKETING_TEXT = `■ 서비스 마케팅 활용 동의

수집된 연락처(문자/이메일)를 통해 아래 정보를 수신하는 것에 동의합니다.

수신 정보
• 일잇다 서비스 소식 및 신규 기능 안내
• 이벤트, 할인 혜택, 프로모션 정보
• 맞춤 서비스 추천

수신 방법
SMS/MMS, 이메일

동의 철회
동의 후에도 언제든지 수신 거부가 가능합니다.
(마케팅 동의 철회는 담당자에게 문의해 주세요)`

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

function Field({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function inputCls(err?: string) {
  return `w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all ${
    err
      ? 'border-red-400 ring-2 ring-red-100 bg-white'
      : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:bg-white'
  }`
}

function OptionGroup({
  label, options, value, onChange,
}: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="mb-5">
      <p className="text-sm font-semibold text-slate-700 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              value === opt
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function ConsentModal({ title, content, onClose }: {
  title: string; content: string; onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-t-2xl sm:rounded-2xl p-6 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-slate-800 mb-4">{title}</h3>
        <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{content}</div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl text-white font-bold text-sm"
          style={{ background: '#2563EB' }}
        >
          확인
        </button>
      </div>
    </div>
  )
}

export default function RequestPage({ params }: PageProps) {
  const { slug } = use(params)

  const [splash, setSplash] = useState(true)
  const [splashHide, setSplashHide] = useState(false)
  const [appVisible, setAppVisible] = useState(false)

  const [pageError, setPageError] = useState<string | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [formConfig, setFormConfig] = useState<FormConfig>(DEFAULT_FORM_CONFIG)

  const [form, setForm] = useState<RequestForm>(INITIAL_FORM)
  const [consentPrivacy, setConsentPrivacy] = useState(false)
  const [consentMarketing, setConsentMarketing] = useState(false)
  const [showModal, setShowModal] = useState<'privacy' | 'marketing' | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setSplashHide(true), 1400)
    const t2 = setTimeout(() => { setSplash(false); setAppVisible(true) }, 2050)

    fetch(`/api/request/${slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) {
          setPageError(json.error ?? '존재하지 않는 신청 페이지입니다.')
        } else if (json.data?.formConfig) {
          setFormConfig(json.data.formConfig as FormConfig)
        }
      })
      .catch(() => setPageError('페이지를 불러오는 중 오류가 발생했습니다.'))
      .finally(() => setIsPageLoading(false))

    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [slug])

  const set = (key: keyof RequestForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {}
    if (!form.client_name.trim())   e.client_name = '업체명/이름을 입력해 주세요.'
    if (!form.client_phone.trim())  e.client_phone = '연락처를 입력해 주세요.'
    if (!form.client_address.trim()) e.client_address = '주소를 입력해 주세요.'
    if (!form.desired_date)         e.desired_date = '희망 방문일을 선택해 주세요.'
    if (!form.desired_time)         e.desired_time = '희망 시간을 선택해 주세요.'
    if (!form.care_scope.trim())    e.care_scope = '청소 범위를 입력해 주세요.'
    if (!consentPrivacy)            e.consent_privacy = '개인정보 제공에 동의해 주세요.'
    if (!consentMarketing)          e.consent_marketing = '서비스 마케팅 활용에 동의해 주세요.'
    return e
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/request/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) { setErrors({ _global: json.error ?? '신청 중 오류가 발생했습니다.' }); return }
      setIsDone(true)
    } catch {
      setErrors({ _global: '네트워크 오류가 발생했습니다.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* ── 스플래시 ── */}
      {splash && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5"
          style={{
            background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
            opacity: splashHide ? 0 : 1,
            transform: splashHide ? 'scale(1.03)' : 'scale(1)',
            transition: 'opacity 0.55s ease, transform 0.55s ease',
          }}
        >
          <div style={{ animation: 'itdPop 0.7s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <p className="text-4xl font-black text-white tracking-tight">일잇다</p>
          </div>
          <div style={{ animation: 'itdFade 0.5s ease 0.35s both' }}>
            <p
              className="text-xs font-medium text-center"
              style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '3px' }}
            >
              SERVICE PLATFORM
            </p>
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), rgba(255,255,255,0.3), transparent)',
              animation: 'itdBar 1.2s ease 0.1s both',
            }}
          />
          <style>{`
            @keyframes itdPop {
              0%   { transform:scale(0.3); opacity:0 }
              60%  { transform:scale(1.08) }
              100% { transform:scale(1); opacity:1 }
            }
            @keyframes itdFade {
              from { opacity:0; transform:translateY(8px) }
              to   { opacity:1; transform:translateY(0) }
            }
            @keyframes itdBar {
              from { transform:scaleX(0) }
              to   { transform:scaleX(1) }
            }
          `}</style>
        </div>
      )}

      {/* ── 앱 본문 ── */}
      <div
        style={{
          opacity: appVisible ? 1 : 0,
          transform: appVisible ? 'translateY(0)' : 'translateY(14px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
          minHeight: '100vh',
          background: '#f1f5f9',
          fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
        }}
      >
        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%)',
          padding: '48px 20px 56px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(255,255,255,0.1) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), rgba(255,255,255,0.3), transparent)',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.95)', fontSize: 11, fontWeight: 600,
              padding: '4px 14px', borderRadius: 999, letterSpacing: 1, marginBottom: 14,
            }}>
              SERVICE INQUIRY
            </div>
            <p style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 10, letterSpacing: '-0.5px', whiteSpace: 'pre-line' }}>
              {isPageLoading ? '...' : (pageError ? '서비스 신청' : '일잇다\n서비스를 신청하세요')}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {formConfig.hero_subtitle}
            </p>
          </div>
        </div>

        {/* 상태별 분기 */}
        {isPageLoading ? (
          <div className="flex justify-center py-16">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#2563EB', borderTopColor: 'transparent' }}
            />
          </div>
        ) : pageError ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <p className="text-lg font-semibold text-slate-800 mb-2">존재하지 않는 신청 페이지입니다</p>
            <p className="text-sm text-slate-500">{pageError}</p>
          </div>
        ) : isDone ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)' }}
            >
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-3">신청 완료!</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-2 break-keep">
              일잇다 담당자가 확인 후 빠르게 연락드리겠습니다.
            </p>
          </div>
        ) : (
          /* ── 폼 ── */
          <div className="max-w-xl mx-auto px-4 py-7 pb-16">

            {/* 기본 정보 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                  <User size={16} style={{ color: '#2563EB' }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">기본 정보</p>
                  <p className="text-xs text-slate-400">고객 기본 정보를 입력해주세요</p>
                </div>
              </div>

              <Field label="업체명 / 이름" required error={errors.client_name}>
                <input
                  className={inputCls(errors.client_name)}
                  placeholder="예: 스타벅스 판교점"
                  value={form.client_name}
                  onChange={(e) => set('client_name')(e.target.value)}
                />
              </Field>
              <Field label="연락처" required error={errors.client_phone}>
                <input
                  type="tel"
                  className={inputCls(errors.client_phone)}
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
              {formConfig.show_fields.email && (
                <Field label="이메일">
                  <input
                    type="email"
                    className={inputCls()}
                    placeholder="example@email.com"
                    value={form.email}
                    onChange={(e) => set('email')(e.target.value)}
                  />
                </Field>
              )}
              {formConfig.show_fields.business_number && (
                <Field label="사업자번호">
                  <input
                    className={inputCls()}
                    placeholder="000-00-00000"
                    value={form.business_number}
                    onChange={(e) => set('business_number')(e.target.value)}
                  />
                </Field>
              )}
              {formConfig.show_fields.account_number && (
                <Field label="계좌번호">
                  <input
                    className={inputCls()}
                    placeholder="예: 국민은행 123-456-789012"
                    value={form.account_number}
                    onChange={(e) => set('account_number')(e.target.value)}
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

            {/* 서비스 · 현장 정보 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50">
                  <Building2 size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">서비스 · 현장 정보</p>
                  <p className="text-xs text-slate-400">케어 관련 정보를 입력해주세요</p>
                </div>
              </div>

              <Field label="주소" required error={errors.client_address}>
                <input
                  className={inputCls(errors.client_address)}
                  placeholder="예: 성남시 분당구 판교역로..."
                  value={form.client_address}
                  onChange={(e) => set('client_address')(e.target.value)}
                />
              </Field>
              <Field label="희망 방문일" required error={errors.desired_date}>
                <input
                  type="date"
                  className={inputCls(errors.desired_date)}
                  value={form.desired_date}
                  onChange={(e) => set('desired_date')(e.target.value)}
                />
              </Field>
              <Field label="희망 시간" required error={errors.desired_time}>
                <select
                  className={inputCls(errors.desired_time)}
                  value={form.desired_time}
                  onChange={(e) => set('desired_time')(e.target.value)}
                >
                  <option value="">시간을 선택해 주세요</option>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
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
              {formConfig.show_fields.building_access && (
                <OptionGroup
                  label="건물출입신청여부"
                  options={['자유출입', '사전출입신청']}
                  value={form.building_access}
                  onChange={set('building_access')}
                />
              )}
              {formConfig.show_fields.access_method && (
                <Field label="출입 방법 상세">
                  <input
                    className={inputCls()}
                    placeholder="예: 비밀번호 1234, 1층 경비실 문의"
                    value={form.access_method}
                    onChange={(e) => set('access_method')(e.target.value)}
                  />
                </Field>
              )}
              <Field label="청소 범위" required error={errors.care_scope}>
                <textarea
                  rows={3}
                  className={`${inputCls(errors.care_scope)} resize-y`}
                  placeholder="예: 주방 후드, 환풍기, 에어컨 실내기 3대"
                  value={form.care_scope}
                  onChange={(e) => set('care_scope')(e.target.value)}
                />
              </Field>
            </div>

            {/* 요청사항 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50">
                  <PenLine size={16} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">요청사항</p>
                  <p className="text-xs text-slate-400">추가 요청사항을 입력해주세요</p>
                </div>
              </div>

              <Field label="요청사항">
                <textarea
                  rows={4}
                  className={`${inputCls()} resize-y`}
                  placeholder="특이사항, 추가 요청사항을 자유롭게 입력해주세요"
                  value={form.notes}
                  onChange={(e) => set('notes')(e.target.value)}
                />
              </Field>
            </div>

            {/* 동의사항 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FEF3C7' }}>
                  <Shield size={16} style={{ color: '#D97706' }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">동의사항</p>
                  <p className="text-xs text-slate-400">아래 항목에 동의해 주세요</p>
                </div>
              </div>

              {/* 개인정보 동의 */}
              <div className={`flex items-start gap-3 p-3.5 rounded-xl mb-1 border transition-colors ${
                consentPrivacy
                  ? 'border-blue-200 bg-blue-50'
                  : errors.consent_privacy
                  ? 'border-red-200 bg-red-50'
                  : 'border-slate-200 bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  id="consent-privacy"
                  checked={consentPrivacy}
                  onChange={(e) => setConsentPrivacy(e.target.checked)}
                  className="mt-0.5 w-4 h-4 flex-shrink-0 accent-blue-600"
                />
                <div className="flex-1 min-w-0">
                  <label htmlFor="consent-privacy" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    개인정보 수집·이용 동의 <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">서비스 신청 접수 및 처리를 위한 개인정보 수집에 동의합니다.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal('privacy')}
                  className="text-xs font-medium flex-shrink-0 hover:underline"
                  style={{ color: '#2563EB' }}
                >
                  보기
                </button>
              </div>
              {errors.consent_privacy && (
                <p className="text-xs text-red-500 mb-3 pl-1">{errors.consent_privacy}</p>
              )}

              {/* 마케팅 동의 */}
              <div className={`flex items-start gap-3 p-3.5 rounded-xl mt-3 border transition-colors ${
                consentMarketing
                  ? 'border-blue-200 bg-blue-50'
                  : errors.consent_marketing
                  ? 'border-red-200 bg-red-50'
                  : 'border-slate-200 bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  id="consent-marketing"
                  checked={consentMarketing}
                  onChange={(e) => setConsentMarketing(e.target.checked)}
                  className="mt-0.5 w-4 h-4 flex-shrink-0 accent-blue-600"
                />
                <div className="flex-1 min-w-0">
                  <label htmlFor="consent-marketing" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    서비스 마케팅 활용 동의 <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">일잇다의 서비스 안내, 이벤트, 프로모션 정보 수신에 동의합니다.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal('marketing')}
                  className="text-xs font-medium flex-shrink-0 hover:underline"
                  style={{ color: '#2563EB' }}
                >
                  보기
                </button>
              </div>
              {errors.consent_marketing && (
                <p className="text-xs text-red-500 mt-1 pl-1">{errors.consent_marketing}</p>
              )}
            </div>

            {/* 제출 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              {errors._global && (
                <p className="text-sm text-red-500 mb-4">{errors._global}</p>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl text-white text-base font-black flex items-center justify-center gap-2 transition-all"
                style={{
                  background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                  boxShadow: isSubmitting ? 'none' : '0 4px 20px rgba(37,99,235,0.35)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    전송 중...
                  </>
                ) : '신청하기'}
              </button>
              <p className="text-xs text-slate-400 text-center mt-3 leading-relaxed">
                제출하신 정보는 서비스 신청 목적으로만 사용되며,<br />담당자 확인 후 연락드리겠습니다.
              </p>
            </div>

          </div>
        )}

        <div className="text-center py-5 text-xs text-slate-400">© 2025 일잇다. All rights reserved.</div>
      </div>

      {/* 동의 내용 모달 */}
      {showModal && (
        <ConsentModal
          title={showModal === 'privacy' ? '개인정보 수집·이용 동의' : '서비스 마케팅 활용 동의'}
          content={showModal === 'privacy' ? PRIVACY_TEXT : MARKETING_TEXT}
          onClose={() => setShowModal(null)}
        />
      )}
    </>
  )
}
