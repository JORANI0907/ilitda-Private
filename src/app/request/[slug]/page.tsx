'use client'

import { useState, useEffect, useRef } from 'react'
import { use } from 'react'
import {
  CheckCircle, CheckCircle2, XCircle, X,
  User, Building2, PenLine, Shield, SlidersHorizontal, Search, Loader2,
} from 'lucide-react'
import { DEFAULT_FORM_CONFIG } from '@/lib/settings-defaults'
import type { FormConfig } from '@/types'

interface CustomFieldDef {
  key: string
  label: string
  placeholder: string
}

interface PageProps {
  params: Promise<{ slug: string }>
}

interface RequestForm {
  client_name: string
  client_phone: string
  client_address: string
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
  custom_fields: Record<string, string>
}

const INITIAL_FORM: RequestForm = {
  client_name: '', client_phone: '', client_address: '',
  notes: '',
  owner_name: '', email: '', business_number: '',
  account_number: '', payment_method: '',
  elevator: '', parking: '', building_access: '',
  access_method: '', care_scope: '',
  custom_fields: {},
}

const PRIVACY_TEXT = `■ 개인정보 수집·이용에 관한 안내

수집 항목
• 업체명/이름, 담당자명, 연락처, 이메일
• 사업자번호, 주소, 희망 방문 일시
• 서비스 내용, 요청사항 등 서비스 신청 관련 정보

수집 목적
서비스 신청 접수 및 처리, 견적 안내, 담당자 연락

보유 기간
서비스 신청일로부터 3년
(단, 관련 법령에 따라 보유 기간이 달라질 수 있습니다)

귀하는 개인정보 수집·이용에 동의를 거부할 권리가 있습니다.
단, 동의 거부 시 서비스 신청이 불가합니다.`

const getMarketingText = (brandName: string) => `■ 서비스 마케팅 활용 동의

수집된 연락처(문자/이메일)를 통해 아래 정보를 수신하는 것에 동의합니다.

수신 정보
• ${brandName} 서비스 소식 및 신규 기능 안내
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

function formatBizNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 10)}`
}

type BizVerifyStatus = 'idle' | 'loading' | 'valid' | 'invalid' | 'error'

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
  const [businessName, setBusinessName] = useState<string>('일잇다')

  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([])

  const [form, setForm] = useState<RequestForm>(INITIAL_FORM)
  const [consentPrivacy, setConsentPrivacy] = useState(false)
  const [consentMarketing, setConsentMarketing] = useState(false)
  const [showModal, setShowModal] = useState<'privacy' | 'marketing' | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  // 연락처 OTP 인증
  const [phoneOtpSent, setPhoneOtpSent] = useState(false)
  const [phoneOtp, setPhoneOtp] = useState('')
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [phoneOtpError, setPhoneOtpError] = useState<string | null>(null)

  // 사업자번호 인증
  const [noBizNumber, setNoBizNumber] = useState(false)
  const [bizVerifyStatus, setBizVerifyStatus] = useState<BizVerifyStatus>('idle')
  const [bizVerifyMessage, setBizVerifyMessage] = useState('')

  // 주소 검색
  const [addressDetail, setAddressDetail] = useState('')
  const [showAddressSearch, setShowAddressSearch] = useState(false)
  const addressSearchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t1 = setTimeout(() => setSplashHide(true), 1400)
    const t2 = setTimeout(() => { setSplash(false); setAppVisible(true) }, 2050)

    fetch(`/api/request/${slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) {
          setPageError(json.error ?? '존재하지 않는 신청 페이지입니다.')
        } else {
          if (json.data?.businessName) setBusinessName(json.data.businessName)
          if (json.data?.formConfig) setFormConfig(json.data.formConfig as FormConfig)
          if (json.data?.customFieldDefs) setCustomFieldDefs(json.data.customFieldDefs as CustomFieldDef[])
        }
      })
      .catch(() => setPageError('페이지를 불러오는 중 오류가 발생했습니다.'))
      .finally(() => setIsPageLoading(false))

    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [slug])

  // 카카오 주소 검색 위젯 임베드
  useEffect(() => {
    if (!showAddressSearch) return
    const container = addressSearchRef.current
    if (!container) return

    function embed() {
      if (!container) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any
      if (!w.daum?.Postcode) return
      new w.daum.Postcode({
        oncomplete: (data: { roadAddress: string; jibunAddress: string; address: string }) => {
          const addr = data.roadAddress || data.jibunAddress || data.address
          setForm(prev => ({ ...prev, client_address: addr }))
          setAddressDetail('')
          setShowAddressSearch(false)
        },
        width: '100%',
        height: '100%',
      }).embed(container)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).daum?.Postcode) {
      embed()
    } else {
      const script = document.createElement('script')
      script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
      script.onload = embed
      document.head.appendChild(script)
    }
  }, [showAddressSearch])

  const set = (key: keyof Omit<RequestForm, 'custom_fields'>) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const setCustomField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, custom_fields: { ...prev.custom_fields, [key]: value } }))

  async function handleSendOtp() {
    const digits = form.client_phone.replace(/-/g, '')
    if (digits.length < 10) { setPhoneOtpError('올바른 휴대폰 번호를 입력해주세요.'); return }
    setPhoneOtpLoading(true)
    setPhoneOtpError(null)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      })
      const json = await res.json()
      if (!res.ok) { setPhoneOtpError(json.error ?? '인증번호 발송에 실패했습니다.'); return }
      setPhoneOtpSent(true)
    } catch {
      setPhoneOtpError('네트워크 오류가 발생했습니다.')
    } finally {
      setPhoneOtpLoading(false)
    }
  }

  async function handleVerifyPhone() {
    const digits = form.client_phone.replace(/-/g, '')
    if (phoneOtp.length !== 6) { setPhoneOtpError('6자리 인증번호를 입력해주세요.'); return }
    setPhoneOtpError(null)
    try {
      const res = await fetch('/api/request/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, otp: phoneOtp }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) { setPhoneOtpError(json.error ?? '인증에 실패했습니다.'); return }
      if (json.data?.valid) {
        setPhoneVerified(true)
      } else {
        setPhoneOtpError('인증번호가 올바르지 않거나 만료되었습니다.')
      }
    } catch {
      setPhoneOtpError('네트워크 오류가 발생했습니다.')
    }
  }

  async function handleVerifyBiz() {
    if (!form.business_number.trim()) return
    setBizVerifyStatus('loading')
    setBizVerifyMessage('')
    try {
      const res = await fetch('/api/auth/check-biz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessNumber: form.business_number.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setBizVerifyStatus('error')
        setBizVerifyMessage(json.message ?? '조회 중 오류가 발생했습니다.')
        return
      }
      setBizVerifyStatus(json.valid ? 'valid' : 'invalid')
      setBizVerifyMessage(json.message ?? '')
    } catch {
      setBizVerifyStatus('error')
      setBizVerifyMessage('네트워크 오류가 발생했습니다.')
    }
  }

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {}
    if (!form.client_name.trim())    e.client_name = '업체명/이름을 입력해 주세요.'
    if (!form.client_phone.trim())   e.client_phone = '연락처를 입력해 주세요.'
    else if (!phoneVerified)          e.client_phone = '연락처 인증을 완료해 주세요.'
    if (!form.client_address.trim()) e.client_address = '주소를 입력해 주세요.'
    if (!form.care_scope.trim())     e.care_scope = '서비스 내용을 입력해 주세요.'
    if (!consentPrivacy)             e.consent_privacy = '개인정보 제공에 동의해 주세요.'
    if (!consentMarketing)           e.consent_marketing = '서비스 마케팅 활용에 동의해 주세요.'
    return e
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setIsSubmitting(true)
    try {
      const fullAddress = addressDetail.trim()
        ? `${form.client_address} ${addressDetail.trim()}`
        : form.client_address
      const res = await fetch(`/api/request/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, client_address: fullAddress }),
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
            <p className="text-4xl font-black text-white tracking-tight">{businessName}</p>
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
              {isPageLoading ? '...' : (pageError ? '서비스 신청' : `${businessName}\n서비스를 신청하세요`)}
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
              {businessName} 담당자가 확인 후 빠르게 연락드리겠습니다.
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

              {/* 연락처 — OTP 인증 방식 */}
              <Field label="연락처" required error={errors.client_phone}>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    className={`flex-1 ${inputCls(errors.client_phone)}`}
                    placeholder="010-0000-0000"
                    value={form.client_phone}
                    onChange={(e) => {
                      if (!phoneVerified) {
                        set('client_phone')(formatPhone(e.target.value))
                        setPhoneOtpSent(false)
                        setPhoneOtp('')
                        setPhoneOtpError(null)
                      }
                    }}
                    maxLength={13}
                    readOnly={phoneVerified}
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={phoneVerified || phoneOtpLoading || form.client_phone.replace(/-/g, '').length < 10}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex items-center gap-1.5 border transition-all ${
                      phoneVerified
                        ? 'bg-green-50 text-green-700 border-green-200 cursor-default'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 disabled:opacity-40'
                    }`}
                  >
                    {phoneVerified ? (
                      <><CheckCircle2 size={13} />인증완료</>
                    ) : phoneOtpLoading ? (
                      <><Loader2 size={13} className="animate-spin" />발송중</>
                    ) : phoneOtpSent ? '재발송' : '인증번호'}
                  </button>
                </div>
                {phoneOtpSent && !phoneVerified && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      className={`flex-1 ${inputCls()}`}
                      placeholder="6자리 인증번호 입력"
                      maxLength={6}
                      value={phoneOtp}
                      onChange={(e) => { setPhoneOtp(e.target.value.replace(/\D/g, '')); setPhoneOtpError(null) }}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyPhone}
                      disabled={phoneOtp.length !== 6}
                      className="px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 transition-all"
                    >
                      확인
                    </button>
                  </div>
                )}
                {phoneOtpError && <p className="text-xs text-red-500 mt-1">{phoneOtpError}</p>}
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

              {/* 사업자번호 — 인증 방식 (field KEY 기반, show/hide 재진입 시에도 동작) */}
              {formConfig.show_fields.business_number && (
                <Field label="사업자번호">
                  {/* 없음 체크박스 */}
                  <label className="flex items-center gap-2 mb-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={noBizNumber}
                      onChange={(e) => {
                        setNoBizNumber(e.target.checked)
                        if (e.target.checked) {
                          set('business_number')('')
                          setBizVerifyStatus('idle')
                          setBizVerifyMessage('')
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-sm text-slate-600">사업자번호가 없습니다</span>
                  </label>

                  {noBizNumber ? (
                    <p className="text-xs text-slate-400 py-2">사업자번호 없이도 신청 가능합니다.</p>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          className={`flex-1 ${inputCls(
                            bizVerifyStatus === 'invalid' || bizVerifyStatus === 'error' ? 'err' : ''
                          )}`}
                          style={{
                            borderColor: bizVerifyStatus === 'valid' ? '#22c55e'
                              : bizVerifyStatus === 'invalid' || bizVerifyStatus === 'error' ? '#ef4444'
                              : undefined,
                          }}
                          placeholder="000-00-00000"
                          value={form.business_number}
                          maxLength={12}
                          readOnly={bizVerifyStatus === 'valid'}
                          onChange={(e) => {
                            if (bizVerifyStatus !== 'valid') {
                              set('business_number')(formatBizNumber(e.target.value))
                              setBizVerifyStatus('idle')
                              setBizVerifyMessage('')
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyBiz}
                          disabled={bizVerifyStatus === 'valid' || bizVerifyStatus === 'loading' || form.business_number.replace(/-/g, '').length < 10}
                          className={`px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex items-center gap-1.5 border transition-all ${
                            bizVerifyStatus === 'valid'
                              ? 'bg-green-50 text-green-700 border-green-200 cursor-default'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 disabled:opacity-40'
                          }`}
                        >
                          {bizVerifyStatus === 'valid' ? (
                            <><CheckCircle2 size={13} />인증완료</>
                          ) : bizVerifyStatus === 'loading' ? (
                            <><Loader2 size={13} className="animate-spin" />조회중</>
                          ) : (
                            <><Search size={13} />인증</>
                          )}
                        </button>
                      </div>
                      {bizVerifyStatus === 'valid' && (
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 size={12} /><span>{bizVerifyMessage}</span>
                        </div>
                      )}
                      {(bizVerifyStatus === 'invalid' || bizVerifyStatus === 'error') && (
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                          <XCircle size={12} /><span>{bizVerifyMessage}</span>
                        </div>
                      )}
                    </>
                  )}
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

              {/* 주소 — 카카오 검색 방식 */}
              <Field label="주소" required error={errors.client_address}>
                <div className="flex gap-2">
                  <input
                    className={`flex-1 ${inputCls(errors.client_address)}`}
                    placeholder="주소 검색 버튼을 눌러 선택하세요"
                    value={form.client_address}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddressSearch(true)}
                    className="px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex items-center gap-1.5 border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 transition-all"
                  >
                    <Search size={13} />검색
                  </button>
                </div>
                {form.client_address && (
                  <input
                    className={`mt-2 ${inputCls()}`}
                    placeholder="상세 주소 입력 (동/호수 등)"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                  />
                )}
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
              <Field label="서비스 내용" required error={errors.care_scope}>
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

            {/* 추가 정보 (사업자 커스텀 필드) */}
            {customFieldDefs.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100">
                    <SlidersHorizontal size={16} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">추가 정보</p>
                    <p className="text-xs text-slate-400">추가 정보를 입력해주세요</p>
                  </div>
                </div>

                {customFieldDefs.map((def) => (
                  <Field key={def.key} label={def.label}>
                    <input
                      className={inputCls()}
                      placeholder={def.placeholder || def.label}
                      value={form.custom_fields[def.key] ?? ''}
                      onChange={(e) => setCustomField(def.key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
            )}

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
                  <p className="text-xs text-slate-500 mt-0.5">{businessName}의 서비스 안내, 이벤트, 프로모션 정보 수신에 동의합니다.</p>
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

        <div className="text-center py-5 text-xs text-slate-400">© 2025 {businessName}. All rights reserved.</div>
      </div>

      {/* 동의 내용 모달 */}
      {showModal && (
        <ConsentModal
          title={showModal === 'privacy' ? '개인정보 수집·이용 동의' : '서비스 마케팅 활용 동의'}
          content={showModal === 'privacy' ? PRIVACY_TEXT : getMarketingText(businessName)}
          onClose={() => setShowModal(null)}
        />
      )}

      {/* 카카오 주소 검색 모달 */}
      {showAddressSearch && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-stretch justify-end"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowAddressSearch(false)}
        >
          <div
            className="bg-white rounded-t-2xl overflow-hidden flex flex-col"
            style={{ height: '70vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
              <p className="text-sm font-bold text-slate-800">주소 검색</p>
              <button type="button" onClick={() => setShowAddressSearch(false)}>
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div ref={addressSearchRef} className="flex-1" />
          </div>
        </div>
      )}
    </>
  )
}
