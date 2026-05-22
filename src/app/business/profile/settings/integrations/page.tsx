'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Phone, Mail, BarChart2, CheckCircle2, XCircle, Loader2, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'
import { PLAN_SMS_LIMITS, type Business } from '@/types'

// ─── 상태 배지 ───────────────────────────────────────────────
function StatusBadge({ verified, label }: { verified: boolean; label: string }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-state-success">
      <CheckCircle2 size={13} /> {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-text-tertiary">
      <XCircle size={13} /> 미설정
    </span>
  )
}

// ─── 섹션 래퍼 ───────────────────────────────────────────────
function Section({ icon, title, badge, children }: {
  icon: React.ReactNode
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface rounded-2xl border-2 border-border-subtle px-4 py-4 shadow-flat flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-brand-600">{icon}</span>
          <p className="text-sm font-bold text-text-primary">{title}</p>
        </div>
        {badge}
      </div>
      {children}
    </div>
  )
}

// ─── 메인 ────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const router = useRouter()
  const [biz, setBiz] = useState<Business | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showHelpDrawer, setShowHelpDrawer] = useState(false)

  // Solapi 상태
  const [phoneInput, setPhoneInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [pendingUniqueId, setPendingUniqueId] = useState<string | null>(null)
  const [pendingPhone, setPendingPhone] = useState('')
  const [solapiLoading, setSolapiLoading] = useState(false)
  const [solapiError, setSolapiError] = useState<string | null>(null)

  // Drive 상태
  const [gmailInput, setGmailInput] = useState('')
  const [driveLoading, setDriveLoading] = useState(false)
  const [driveError, setDriveError] = useState<string | null>(null)
  const [driveSuccess, setDriveSuccess] = useState(false)

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/profile')
        const json = await res.json()
        if (json.success && json.data?.business) {
          const b = json.data.business as Business
          setBiz(b)
          setPhoneInput(b.solapi_from_phone ?? '')
          setGmailInput(b.gmail_for_drive ?? '')
        }
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  // ── Solapi ──────────────────────────────────────────────────
  async function handleRequestOtp() {
    const phone = phoneInput.replace(/[^0-9]/g, '')
    if (phone.length < 10) { setSolapiError('올바른 전화번호를 입력해주세요.'); return }
    setSolapiLoading(true)
    setSolapiError(null)
    try {
      const res = await fetch('/api/admin/integrations/solapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      })
      const json = await res.json()
      if (!json.success) { setSolapiError(json.error ?? '요청 실패'); return }
      setPendingUniqueId(json.data.uniqueId)
      setPendingPhone(phone)
      setOtpInput('')
    } catch {
      setSolapiError('네트워크 오류가 발생했습니다.')
    } finally {
      setSolapiLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (!pendingUniqueId || otpInput.length < 5) { setSolapiError('인증번호를 입력해주세요.'); return }
    setSolapiLoading(true)
    setSolapiError(null)
    try {
      const res = await fetch('/api/admin/integrations/solapi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueId: pendingUniqueId, otp: otpInput, phoneNumber: pendingPhone }),
      })
      const json = await res.json()
      if (!json.success) { setSolapiError(json.error ?? '인증 실패'); return }
      setBiz(prev => prev ? { ...prev, solapi_from_phone: pendingPhone, solapi_phone_verified: true } : prev)
      setPendingUniqueId(null)
      setOtpInput('')
    } catch {
      setSolapiError('네트워크 오류가 발생했습니다.')
    } finally {
      setSolapiLoading(false)
    }
  }

  async function handleRemoveSolapi() {
    if (!confirm('발신번호 연동을 해제하시겠습니까?')) return
    setSolapiLoading(true)
    try {
      await fetch('/api/admin/integrations/solapi', { method: 'DELETE' })
      setBiz(prev => prev ? { ...prev, solapi_from_phone: null, solapi_phone_verified: false } : prev)
      setPhoneInput('')
      setPendingUniqueId(null)
    } finally {
      setSolapiLoading(false)
    }
  }

  // ── Google Drive ─────────────────────────────────────────────
  async function handleConnectDrive() {
    if (!gmailInput.includes('@')) { setDriveError('올바른 Gmail 주소를 입력해주세요.'); return }
    setDriveLoading(true)
    setDriveError(null)
    setDriveSuccess(false)
    try {
      const res = await fetch('/api/admin/integrations/drive', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gmail: gmailInput.trim() }),
      })
      const json = await res.json()
      if (!json.success) { setDriveError(json.error ?? '연동 실패'); return }
      setBiz(prev => prev ? { ...prev, gmail_for_drive: gmailInput.trim() } : prev)
      setDriveSuccess(true)
      setTimeout(() => setDriveSuccess(false), 3000)
    } catch {
      setDriveError('네트워크 오류가 발생했습니다.')
    } finally {
      setDriveLoading(false)
    }
  }

  async function handleRemoveDrive() {
    if (!confirm('드라이브 연동을 해제하시겠습니까?')) return
    setDriveLoading(true)
    try {
      await fetch('/api/admin/integrations/drive', { method: 'DELETE' })
      setBiz(prev => prev ? { ...prev, gmail_for_drive: null, drive_root_folder_id: null } : prev)
      setGmailInput('')
    } finally {
      setDriveLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6">
        <div className="h-8 w-40 rounded-lg bg-surface-sunken animate-pulse" />
        {[0, 1, 2].map(i => <div key={i} className="h-36 rounded-2xl bg-surface-sunken animate-pulse" />)}
      </div>
    )
  }

  const plan = biz?.plan_type ?? 'free'
  const limit = PLAN_SMS_LIMITS[plan] ?? PLAN_SMS_LIMITS.free
  const used = biz?.daily_sms_count ?? 0
  const usedRatio = Math.min(used / limit, 1)

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-1">
        <button type="button" onClick={() => router.back()} className="p-1 -ml-1 text-text-tertiary hover:text-text-primary transition-colors">
          <ArrowLeft size={20} />
        </button>
        <SectionHeader title="연동 설정" level="page" />
      </div>

      {/* 도움말 배너 */}
      <HelpBanner
        label="외부 연동 안내 보기"
        onClick={() => setShowHelpDrawer(true)}
      />

      {/* 도움말 드로어 */}
      <HelpDrawer
        open={showHelpDrawer}
        onClose={() => setShowHelpDrawer(false)}
        title="외부 연동 안내"
        sections={[
          {
            title: '솔라피(Solapi) 연동이란?',
            content: '솔라피는 문자 발송 서비스입니다.\n솔라피 연동을 완료하면 고객에게 보내는 알림 문자가 일잇다 기본 번호가 아닌 내 사업용 전화번호로 발송됩니다.',
          },
          {
            title: '내 번호로 문자 발송하기',
            content: '연동하면 고객이 받는 문자에 내 사업체 전화번호가 표시됩니다.\n고객 입장에서 모르는 번호가 아니라 익숙한 업체 번호로 알림이 오므로 신뢰도가 높아집니다.',
          },
          {
            title: '연동 방법 (API키 발급 위치)',
            content: '1. https://solapi.com 에 접속 후 회원가입 또는 로그인\n2. 좌측 메뉴 → [발신번호 관리] → 사용할 전화번호 등록\n3. 아래 [인증 요청] 버튼을 눌러 번호 인증을 진행하면 연동이 완료됩니다.',
          },
        ]}
      />

      {/* 도움말 팁 (warning) */}
      <HelpTip variant="warning">
        솔라피 연동 전에는 일잇다 기본 발신번호로 문자가 발송됩니다.
      </HelpTip>

      {/* ── 알림 발신번호 ─────────────────────────── */}
      <Section
        icon={<Phone size={16} />}
        title="알림 발신번호 (Solapi)"
        badge={<StatusBadge verified={!!biz?.solapi_phone_verified} label={biz?.solapi_from_phone ?? ''} />}
      >
        <p className="text-xs text-text-tertiary leading-relaxed">
          인증된 번호로 고객에게 알림이 발송됩니다. 번호 인증 시 해당 번호로 인증번호가 발송됩니다.
        </p>

        {!pendingUniqueId ? (
          // 1단계: 번호 입력
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                placeholder="010-0000-0000"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                className="flex-1"
              />
              <Button size="md" onClick={handleRequestOtp} isLoading={solapiLoading} className="whitespace-nowrap">
                인증 요청
              </Button>
            </div>
            {biz?.solapi_phone_verified && (
              <Button variant="ghost" size="sm" onClick={handleRemoveSolapi} isLoading={solapiLoading}>
                발신번호 해제
              </Button>
            )}
          </div>
        ) : (
          // 2단계: OTP 입력
          <div className="flex flex-col gap-2">
            <p className="text-xs text-brand-600 font-medium">
              {pendingPhone} 으로 인증번호를 발송했습니다.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="인증번호 6자리"
                value={otpInput}
                onChange={e => setOtpInput(e.target.value)}
                maxLength={6}
                className="flex-1"
              />
              <Button size="md" onClick={handleVerifyOtp} isLoading={solapiLoading}>
                확인
              </Button>
            </div>
            <button
              type="button"
              className="text-xs text-text-tertiary text-left underline underline-offset-2"
              onClick={() => { setPendingUniqueId(null); setOtpInput('') }}
            >
              번호 다시 입력
            </button>
          </div>
        )}

        {solapiError && <p className="text-xs text-state-danger">{solapiError}</p>}
      </Section>

      {/* ── 구글 드라이브 ─────────────────────────── */}
      <Section
        icon={<Mail size={16} />}
        title="구글 드라이브 연동"
        badge={<StatusBadge verified={!!biz?.gmail_for_drive} label={biz?.gmail_for_drive ?? ''} />}
      >
        <p className="text-xs text-text-tertiary leading-relaxed">
          입력한 Gmail로 업체 전용 드라이브 폴더가 공유됩니다. 연동 후 신청서에서 작업 폴더를 생성하면 자동으로 <span className="font-medium text-text-secondary">작업전 / 작업후</span> 폴더가 만들어지며, 작업자는 로그인 없이 링크로 사진을 업로드할 수 있습니다.
        </p>
        <div className="text-xs text-text-tertiary bg-surface-sunken rounded-xl px-3 py-2 leading-relaxed">
          <p className="font-medium text-text-secondary mb-1">📁 폴더 구조</p>
          <p>일잇다 → <span className="text-text-primary">업체명</span> → <span className="text-text-primary">고객명_날짜</span> → 작업전 / 작업후</p>
          <p className="mt-1">신청서 상세 화면 → <span className="font-medium text-text-primary">작업 폴더 생성</span> 버튼을 누르면 생성됩니다.</p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              placeholder="example@gmail.com"
              value={gmailInput}
              onChange={e => setGmailInput(e.target.value)}
              type="email"
              className="flex-1"
            />
            <Button size="md" onClick={handleConnectDrive} isLoading={driveLoading} className="whitespace-nowrap">
              {biz?.gmail_for_drive ? '재연동' : '연동'}
            </Button>
          </div>
          {biz?.drive_root_folder_id && (
            <a
              href={`https://drive.google.com/drive/folders/${biz.drive_root_folder_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-9 rounded-lg border border-border text-sm font-medium text-brand-600 hover:bg-surface-sunken transition-colors"
            >
              <FolderOpen size={15} />
              내 업체 폴더 열기
            </a>
          )}
          {biz?.gmail_for_drive && (
            <Button variant="ghost" size="sm" onClick={handleRemoveDrive} isLoading={driveLoading}>
              연동 해제
            </Button>
          )}
          {driveSuccess && <p className="text-xs text-state-success">드라이브 폴더가 공유되었습니다. Gmail을 확인해주세요.</p>}
          {driveError && <p className="text-xs text-state-danger">{driveError}</p>}
        </div>
      </Section>

      {/* ── 플랜 & 발송 현황 ─────────────────────── */}
      <Section icon={<BarChart2 size={16} />} title="플랜 & 오늘 발송 현황">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary">현재 플랜</span>
          <span className="text-sm font-bold text-text-primary capitalize">{plan.toUpperCase()} 플랜</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">오늘 발송</span>
            <span className="text-sm font-medium text-text-primary">{used} / {limit} 건</span>
          </div>
          <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usedRatio >= 0.9 ? 'bg-state-danger' : usedRatio >= 0.7 ? 'bg-state-warning' : 'bg-brand-600'}`}
              style={{ width: `${usedRatio * 100}%` }}
            />
          </div>
          {usedRatio >= 1 && (
            <p className="text-xs text-state-danger">오늘 발송 한도에 도달했습니다. 내일 초기화됩니다.</p>
          )}
        </div>

        <div className="pt-1 border-t border-border-subtle">
          <p className="text-xs text-text-tertiary">
            Pro · Max 플랜 업그레이드 시 발송 한도가 늘어납니다. (플랜 관리는 준비 중입니다)
          </p>
        </div>
      </Section>
    </div>
  )
}
