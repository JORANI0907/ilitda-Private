'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Phone, Mail, CheckCircle2, XCircle, Loader2, FolderOpen, Plus, Trash2, Pencil, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'
import type { Business, Profile } from '@/types'

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
  const [pendingPhone, setPendingPhone] = useState('')
  const [solapiLoading, setSolapiLoading] = useState(false)
  const [solapiError, setSolapiError] = useState<string | null>(null)

  // Drive 상태
  const [gmailInput, setGmailInput] = useState('')
  const [driveLoading, setDriveLoading] = useState(false)
  const [driveError, setDriveError] = useState<string | null>(null)
  const [driveSuccess, setDriveSuccess] = useState(false)
  const [showDriveConfirm, setShowDriveConfirm] = useState(false)

  // 이메일 도메인 검사
  const emailDomain = gmailInput.includes('@') ? gmailInput.split('@')[1]?.toLowerCase() ?? '' : ''
  const isGoogleDomain = emailDomain === 'gmail.com' || emailDomain === 'googlemail.com'
  const showNonGoogleWarning = gmailInput.includes('@') && emailDomain.length > 0 && !isGoogleDomain

  // 하위 폴더 편집 상태
  const [subfolderEditing, setSubfolderEditing] = useState(false)
  const [subfolderList, setSubfolderList] = useState<string[]>(['작업전', '작업후'])
  const [subfolderLoading, setSubfolderLoading] = useState(false)
  const [subfolderError, setSubfolderError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/profile')
        const json = await res.json()
        if (json.success && json.data?.business) {
          const b = json.data.business as Business
          const p = json.data.profile as Profile | undefined
          setBiz(b)
          setPhoneInput(b.solapi_from_phone ?? '')
          setGmailInput(b.gmail_for_drive ?? '')
          if (Array.isArray(b.drive_subfolders) && b.drive_subfolders.length > 0) {
            setSubfolderList(b.drive_subfolders)
          }
          // 미인증 상태에서 가입 연락처로 자동 설정
          if (!b.solapi_phone_verified && p?.phone) {
            try {
              const autoRes = await fetch('/api/admin/integrations/solapi', { method: 'PATCH' })
              const autoJson = await autoRes.json()
              if (autoJson.success && autoJson.data?.phone) {
                setBiz(prev => prev ? { ...prev, solapi_from_phone: autoJson.data.phone, solapi_phone_verified: true } : prev)
                setPhoneInput(autoJson.data.phone)
              }
            } catch {
              // 자동 설정 실패 시 수동 입력으로 fallback
            }
          }
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
      setPendingPhone(phone)
      setOtpInput('')
    } catch {
      setSolapiError('네트워크 오류가 발생했습니다.')
    } finally {
      setSolapiLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (!pendingPhone || otpInput.length < 5) { setSolapiError('인증번호를 입력해주세요.'); return }
    setSolapiLoading(true)
    setSolapiError(null)
    try {
      const res = await fetch('/api/admin/integrations/solapi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpInput, phoneNumber: pendingPhone }),
      })
      const json = await res.json()
      if (!json.success) { setSolapiError(json.error ?? '인증 실패'); return }
      setBiz(prev => prev ? { ...prev, solapi_from_phone: pendingPhone, solapi_phone_verified: true } : prev)
      setPendingPhone('')
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
      setPendingPhone('')
    } finally {
      setSolapiLoading(false)
    }
  }

  // ── Google Drive ─────────────────────────────────────────────
  function handleConnectDrive() {
    if (!gmailInput.includes('@')) { setDriveError('올바른 이메일 주소를 입력해주세요.'); return }
    setDriveError(null)
    setShowDriveConfirm(true)
  }

  async function handleConfirmDrive() {
    setShowDriveConfirm(false)
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

  // ── 하위 폴더 저장 ────────────────────────────────────────────
  async function handleSaveSubfolders() {
    const names = subfolderList.map(s => s.trim()).filter(Boolean)
    if (names.length === 0) { setSubfolderError('폴더는 최소 1개 이상이어야 합니다.'); return }
    setSubfolderLoading(true)
    setSubfolderError(null)
    try {
      const res = await fetch('/api/admin/integrations/drive/subfolders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subfolders: names }),
      })
      const json = await res.json()
      if (!json.success) { setSubfolderError(json.error ?? '저장 실패'); return }
      setSubfolderList(names)
      setBiz(prev => prev ? { ...prev, drive_subfolders: names } : prev)
      setSubfolderEditing(false)
    } catch {
      setSubfolderError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubfolderLoading(false)
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

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-1">
        <button type="button" onClick={() => router.push('/business/profile')} className="p-1 -ml-1 text-text-tertiary hover:text-text-primary transition-colors">
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
        title="서비스 알림 발신 번호 설정"
        badge={<StatusBadge verified={!!biz?.solapi_phone_verified} label={biz?.solapi_from_phone ?? ''} />}
      >
        <p className="text-xs text-text-tertiary leading-relaxed">
          인증된 번호로 고객에게 알림이 발송됩니다. 번호 인증 시 해당 번호로 인증번호가 발송됩니다.
        </p>

        {!pendingPhone ? (
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
              onClick={() => { setPendingPhone(''); setOtpInput('') }}
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
          <p>일잇다 → <span className="text-text-primary">업체명</span> → <span className="text-text-primary">고객명_날짜</span> → 하위 폴더</p>
          <p className="mt-1">신청서 상세 화면 → <span className="font-medium text-text-primary">작업 폴더 생성</span> 버튼을 누르면 생성됩니다.</p>
        </div>

        {/* 하위 폴더 구성 편집기 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-text-secondary">하위 폴더 구성</p>
            {!subfolderEditing ? (
              <button
                type="button"
                onClick={() => setSubfolderEditing(true)}
                className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
              >
                <Pencil size={11} /> 편집
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const saved = biz?.drive_subfolders
                    setSubfolderList(Array.isArray(saved) && saved.length > 0 ? saved : ['작업전', '작업후'])
                    setSubfolderEditing(false)
                    setSubfolderError(null)
                  }}
                  className="text-xs text-text-tertiary hover:underline"
                >
                  취소
                </button>
                <Button size="sm" onClick={handleSaveSubfolders} isLoading={subfolderLoading}>
                  저장
                </Button>
              </div>
            )}
          </div>

          {!subfolderEditing ? (
            <div className="flex flex-wrap gap-1.5">
              {subfolderList.map((name, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs bg-surface-sunken border border-border-subtle rounded-full px-2.5 py-1 text-text-secondary">
                  <FolderOpen size={11} className="text-text-tertiary" /> {name}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {subfolderList.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={name}
                    onChange={e => setSubfolderList(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                    className="flex-1 text-xs border border-border rounded-md px-2.5 py-1.5 bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600"
                    placeholder="폴더 이름"
                  />
                  <button
                    type="button"
                    onClick={() => setSubfolderList(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-1 text-text-tertiary hover:text-state-danger transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSubfolderList(prev => [...prev, ''])}
                className="flex items-center gap-1 text-xs text-brand-600 hover:underline self-start mt-0.5"
              >
                <Plus size={12} /> 폴더 추가
              </button>
              {subfolderError && <p className="text-xs text-state-danger">{subfolderError}</p>}
            </div>
          )}
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
          {showNonGoogleWarning && (
            <div className="flex flex-col gap-0.5">
              <p className="text-xs text-state-danger font-medium">구글 메일만 연동이 가능합니다.</p>
              <p className="text-xs text-state-danger">연동 후 개인 저장공간을 사용합니다.</p>
            </div>
          )}
          {isGoogleDomain && gmailInput.length > 0 && (
            <p className="text-xs text-text-tertiary">연동 후 해당 구글 계정의 개인 저장공간을 사용합니다.</p>
          )}
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
          {driveSuccess && (
            <div className="flex flex-col gap-0.5">
              <p className="text-xs text-state-success font-medium">드라이브 폴더 공유 요청이 전송됐습니다.</p>
              <p className="text-xs text-text-tertiary leading-relaxed">
                입력한 이메일로 공유 초대 메일이 발송됐습니다. 메일을 받지 못하셨다면 이메일 주소를 다시 확인해주세요.
              </p>
            </div>
          )}
          {driveError && <p className="text-xs text-state-danger">{driveError}</p>}
        </div>
      </Section>

      {/* ── 드라이브 연동 확인 팝업 ──────────────────── */}
      <Modal
        open={showDriveConfirm}
        onClose={() => setShowDriveConfirm(false)}
        title="드라이브 연동 전 확인"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="md" className="flex-1" onClick={() => setShowDriveConfirm(false)}>
              취소
            </Button>
            <Button size="md" className="flex-1" onClick={handleConfirmDrive}>
              연동하기
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-secondary leading-relaxed">
            <span className="font-semibold text-text-primary">{gmailInput}</span> 계정의 Google Drive 저장공간에 작업 사진이 저장됩니다.
          </p>
          <div className="bg-surface-sunken rounded-xl px-4 py-3 flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-text-primary">💾 저장공간 안내</p>
            <p className="text-xs text-text-secondary leading-relaxed">
              Google 계정 기본 제공 용량은 <span className="font-medium text-text-primary">15GB</span>입니다. 작업 사진이 많아질 경우 용량이 부족할 수 있습니다.
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              용량 부족 시 <span className="font-medium text-text-primary">Google One</span>을 통해 추가 저장공간을 구입하여 사용하실 수 있습니다.
              <br />
              <span className="text-text-tertiary">(100GB 월 2,900원 / 200GB 월 4,000원)</span>
            </p>
          </div>
          <p className="text-xs text-text-tertiary leading-relaxed">
            연동 후에도 언제든지 해제하거나 다른 계정으로 변경하실 수 있습니다.
          </p>
        </div>
      </Modal>

    </div>
  )
}
