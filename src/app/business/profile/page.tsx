'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, Sparkles,
  Bell, LogOut, ArrowLeftRight, ChevronRight,
  CreditCard, Users, Link2, Copy, Check, FileText, LayoutList, ShieldCheck,
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Modal } from '@/components/ui/Modal'
import { LoginPrompt } from '@/components/shared/LoginPrompt'
import { RoleSwitcher } from '@/components/shared/RoleSwitcher'
import type { Profile, Business, Worker } from '@/types'

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  max: 'Max',
}

interface ProfileData {
  profile: Profile
  business: Business | null
  worker: Worker | null
}

export default function BusinessProfilePage() {
  const router = useRouter()
  const [data, setData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUnauthorized, setIsUnauthorized] = useState(false)

  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // 신청 링크 slug 관련 상태
  const [slug, setSlug] = useState('')
  const [slugInput, setSlugInput] = useState('')
  const [isSavingSlug, setIsSavingSlug] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/profile')
        if (res.status === 401) {
          setIsUnauthorized(true)
          setShowLoginPrompt(true)
          return
        }
        const json = await res.json()
        if (json.success) {
          setData(json.data)
          const requestSlug = json.data.business?.request_slug ?? ''
          setSlug(requestSlug)
          setSlugInput(requestSlug)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } finally {
      setIsLoggingOut(false)
      setShowLogoutModal(false)
    }
  }

  const handleSaveSlug = async () => {
    const trimmed = slugInput.trim().toLowerCase()
    if (!trimmed) {
      setSlugError('슬러그를 입력해 주세요.')
      return
    }
    if (!/^[a-z0-9-]{3,30}$/.test(trimmed)) {
      setSlugError('영문 소문자, 숫자, 하이픈만 사용 가능하며 3~30자여야 합니다.')
      return
    }
    setSlugError(null)
    setIsSavingSlug(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_slug: trimmed }),
      })
      const json = await res.json()
      if (!json.success) {
        setSlugError(json.error ?? '저장에 실패했습니다.')
        return
      }
      setSlug(trimmed)
    } catch {
      setSlugError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSavingSlug(false)
    }
  }

  const handleCopyLink = async () => {
    if (!slug) return
    const link = `${window.location.origin}/request/${slug}`
    try {
      await navigator.clipboard.writeText(link)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      // clipboard API 실패 시 무시
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6">
        <div className="h-10 w-32 rounded-lg bg-surface-sunken animate-pulse" />
        <div className="h-28 rounded-2xl bg-surface-sunken animate-pulse" />
        <div className="h-40 rounded-2xl bg-surface-sunken animate-pulse" />
      </div>
    )
  }

  if (isUnauthorized || !data) {
    return (
      <div className="px-4 pt-6">
        <SectionHeader title="프로필" level="page" />
        <div className="mt-10">
          <p className="text-center text-text-secondary text-sm mb-4">
            로그인 후 프로필을 확인할 수 있습니다.
          </p>
          <Button
            fullWidth
            onClick={() => setShowLoginPrompt(true)}
          >
            로그인 하기
          </Button>
        </div>
        <LoginPrompt
          open={showLoginPrompt}
          onClose={() => setShowLoginPrompt(false)}
        />
      </div>
    )
  }

  const { profile, business, worker } = data
  const canSwitchToWorker = profile.is_worker

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      {/* 사업체 헤더 */}
      <Card padding="md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-light flex items-center justify-center shrink-0">
            <Building2 size={28} className="text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-text-primary truncate">
              {business?.business_name ?? profile.name}
            </p>
            {business?.registration_number && (
              <p className="text-xs text-text-tertiary mt-0.5">
                사업자번호: {business.registration_number}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* 가입 정보 */}
      <Card padding="md">
        <SectionHeader title="가입 정보" className="mb-3" />
        <div className="flex flex-col gap-0">
          {/* 내 정보 */}
          <div className="flex flex-col gap-2 pb-3 border-b border-border-subtle">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">내 정보</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-tertiary w-16 shrink-0">이름</span>
                <span className="text-sm text-text-primary">{profile.name || '미입력'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-tertiary w-16 shrink-0">전화번호</span>
                <span className="text-sm text-text-primary">{profile.phone || '미입력'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-tertiary w-16 shrink-0">가입일</span>
                <span className="text-sm text-text-primary">{profile.created_at.slice(0, 10)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-tertiary w-16 shrink-0">역할</span>
                <div className="flex gap-1.5">
                  {profile.is_business && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-light text-brand-700">
                      사업자
                    </span>
                  )}
                  {profile.is_worker && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-state-success-bg text-state-success">
                      용역자
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 사업체 정보 */}
          {profile.is_business && business && (
            <div className="flex flex-col gap-2 py-3 border-b border-border-subtle">
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">사업체 정보</p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-tertiary w-16 shrink-0">상호명</span>
                  <span className="text-sm text-text-primary">{business.business_name || '미입력'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-tertiary w-16 shrink-0">사업자번호</span>
                  <span className="text-sm text-text-primary">{business.registration_number || '미입력'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-text-tertiary w-16 shrink-0 mt-0.5">주소</span>
                  <span className="text-sm text-text-primary break-keep">{business.address || '미입력'}</span>
                </div>
              </div>
            </div>
          )}

          {/* 용역자 정보 */}
          {profile.is_worker && worker && (
            <div className="flex flex-col gap-2 pt-3">
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">용역자 정보</p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-tertiary w-16 shrink-0">생년월일</span>
                  <span className="text-sm text-text-primary">{worker.birthdate || '미입력'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-tertiary w-16 shrink-0">은행명</span>
                  <span className="text-sm text-text-primary">{worker.account_bank || '미입력'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-tertiary w-16 shrink-0">계좌번호</span>
                  <span className="text-sm text-text-primary">{worker.account_number || '미입력'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 역할 전환 */}
      {canSwitchToWorker && (
        <Card
          padding="md"
          className="cursor-pointer hover:border-brand-200 hover:bg-brand-50/30 hover:shadow-card active:scale-[0.98] transition-all"
          onClick={() => setShowRoleSwitcher(true)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ArrowLeftRight size={18} className="text-brand-600" />
              <div>
                <p className="font-medium text-text-primary">용역자로 전환</p>
                <p className="text-xs text-text-secondary mt-0.5">용역자 모드로 전환합니다</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-text-tertiary" />
          </div>
        </Card>
      )}

      {/* 구독 플랜 */}
      <button
        type="button"
        className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
        style={{
          background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 55%, #7C3AED 100%)',
          boxShadow: '0 6px 28px rgba(37,99,235,0.35)',
        }}
        onClick={() => router.push('/business/settings/plan')}
      >
        <div className="p-5 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="absolute -bottom-8 right-10 w-20 h-20 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-yellow-300" />
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>구독 플랜</span>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                {PLAN_LABEL[business?.plan ?? 'free'] ?? 'Free'} 플랜
              </span>
            </div>

            <p className="text-[15px] font-bold text-white leading-snug break-keep mb-3">
              플랜을 변경하고 나만의<br />스마트 비서를 운영하세요
            </p>

            <div className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
              <span className="text-xs font-semibold text-white">플랜 보러가기</span>
              <ChevronRight size={13} className="text-white" />
            </div>
          </div>
        </div>
      </button>

      {/* 설정 */}
      <Card padding="md">
        <SectionHeader title="설정" className="mb-3" />
        <div className="flex flex-col divide-y divide-border-subtle">
          <button
            type="button"
            className="flex items-center justify-between py-3 text-left cursor-pointer hover:bg-surface-sunken active:bg-border transition-colors"
            onClick={() => router.push('/business/profile/settings/app-notifications')}
          >
            <div className="flex items-center gap-3">
              <Bell size={16} className="text-text-tertiary" />
              <span className="text-sm text-text-primary">알림 설정</span>
            </div>
            <ChevronRight size={16} className="text-text-tertiary" />
          </button>

          <button
            type="button"
            className="flex items-center justify-between py-3 text-left cursor-pointer hover:bg-surface-sunken active:bg-border transition-colors"
            onClick={() => router.push('/business/profile/settings/integrations')}
          >
            <div className="flex items-center gap-3">
              <CreditCard size={16} className="text-text-tertiary" />
              <span className="text-sm text-text-primary">발신번호 · 드라이브 연동</span>
            </div>
            <ChevronRight size={16} className="text-text-tertiary" />
          </button>

          <button
            type="button"
            className="flex items-center justify-between py-3 text-left cursor-pointer hover:bg-surface-sunken active:bg-border transition-colors"
            onClick={() => router.push('/business/profile/settings/business')}
          >
            <div className="flex items-center gap-3">
              <Users size={16} className="text-text-tertiary" />
              <span className="text-sm text-text-primary">직원 권한 설정</span>
            </div>
            <ChevronRight size={16} className="text-text-tertiary" />
          </button>
        </div>
      </Card>

      {/* 서비스 설정 */}
      <Card padding="md">
        <SectionHeader title="서비스 설정" className="mb-3" />
        <div className="flex flex-col divide-y divide-border-subtle">
          <button
            type="button"
            className="flex items-center justify-between py-3 text-left cursor-pointer hover:bg-surface-sunken active:bg-border transition-colors"
            onClick={() => router.push('/business/profile/settings/form')}
          >
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-text-tertiary" />
              <div>
                <span className="text-sm text-text-primary">신청서 폼 설정</span>
                <p className="text-xs text-text-tertiary mt-0.5">결제 방법, 표시 항목, 작업자 전달 필드</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-text-tertiary" />
          </button>
          <button
            type="button"
            className="flex items-center justify-between py-3 text-left cursor-pointer hover:bg-surface-sunken active:bg-border transition-colors"
            onClick={() => router.push('/business/profile/settings/notifications')}
          >
            <div className="flex items-center gap-3">
              <Bell size={16} className="text-text-tertiary" />
              <div>
                <span className="text-sm text-text-primary">서비스 알림 설정</span>
                <p className="text-xs text-text-tertiary mt-0.5">발송 규칙, 자동/수동, 문구 커스텀</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-text-tertiary" />
          </button>
          <button
            type="button"
            className="flex items-center justify-between py-3 text-left cursor-pointer hover:bg-surface-sunken active:bg-border transition-colors"
            onClick={() => router.push('/business/profile/settings/panel')}
          >
            <div className="flex items-center gap-3">
              <LayoutList size={16} className="text-text-tertiary" />
              <div>
                <span className="text-sm text-text-primary">서비스 관리 화면 설정</span>
                <p className="text-xs text-text-tertiary mt-0.5">필드 제목, 예시 텍스트, 드롭다운 옵션 커스텀</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-text-tertiary" />
          </button>
        </div>
      </Card>

      {/* 신청 링크 설정 */}
      <Card padding="md">
        <SectionHeader title="신청 링크 설정" className="mb-3" />
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Link2 size={16} className="text-text-tertiary shrink-0" />
            <p className="text-xs text-text-secondary break-all">
              {slug
                ? `${typeof window !== 'undefined' ? window.location.origin : 'https://ilitda.vercel.app'}/request/${slug}`
                : '링크를 설정하면 고객이 신청서를 보낼 수 있어요'}
            </p>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="영문/숫자/하이픈, 3~30자"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value.toLowerCase())}
              />
            </div>
            <Button size="md" onClick={handleSaveSlug} isLoading={isSavingSlug}>
              저장
            </Button>
          </div>

          {slugError && (
            <p className="text-sm text-state-danger">{slugError}</p>
          )}

          {slug && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyLink}
            >
              {isCopied ? <Check size={14} /> : <Copy size={14} />}
              {isCopied ? '복사됨' : '링크 복사'}
            </Button>
          )}
        </div>
      </Card>

      {/* 관리자 패널 (is_admin만 노출) */}
      {profile.is_admin && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} className="text-brand-600" />
            <SectionHeader title="관리자 패널" className="mb-0" />
          </div>
          <div className="flex flex-col divide-y divide-border-subtle">
            <button
              type="button"
              className="flex items-center justify-between py-3 text-left cursor-pointer hover:bg-surface-sunken active:bg-border transition-colors"
              onClick={() => router.push('/admin')}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck size={16} className="text-brand-600" />
                <div>
                  <span className="text-sm text-text-primary">대시보드</span>
                  <p className="text-xs text-text-tertiary mt-0.5">계정 · 플랜 현황 요약</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-text-tertiary" />
            </button>
            <button
              type="button"
              className="flex items-center justify-between py-3 text-left cursor-pointer hover:bg-surface-sunken active:bg-border transition-colors"
              onClick={() => router.push('/admin/accounts')}
            >
              <div className="flex items-center gap-3">
                <Users size={16} className="text-text-tertiary" />
                <div>
                  <span className="text-sm text-text-primary">계정 관리</span>
                  <p className="text-xs text-text-tertiary mt-0.5">전체 가입 계정 및 플랜 확인</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-text-tertiary" />
            </button>
            <button
              type="button"
              className="flex items-center justify-between py-3 text-left cursor-pointer hover:bg-surface-sunken active:bg-border transition-colors"
              onClick={() => router.push('/admin/payments')}
            >
              <div className="flex items-center gap-3">
                <CreditCard size={16} className="text-brand-600" />
                <div>
                  <span className="text-sm text-text-primary">입금 확인</span>
                  <p className="text-xs text-text-tertiary mt-0.5">무통장입금 신청 승인 · 거절</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-text-tertiary" />
            </button>
          </div>
        </Card>
      )}

      {/* 로그아웃 */}
      <Button
        variant="danger"
        fullWidth
        onClick={() => setShowLogoutModal(true)}
      >
        <LogOut size={16} />
        로그아웃
      </Button>

      <div className="h-4" />

      {/* 모달들 */}
      <LoginPrompt
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />

      <Modal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="로그아웃"
        description="정말 로그아웃 하시겠습니까?"
        footer={
          <>
            <Button
              variant="danger"
              fullWidth
              isLoading={isLoggingOut}
              onClick={handleLogout}
            >
              로그아웃
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setShowLogoutModal(false)}
              disabled={isLoggingOut}
            >
              취소
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary leading-normal">
          로그아웃 후 다시 로그인이 필요합니다.
        </p>
      </Modal>

      {data && (
        <RoleSwitcher
          open={showRoleSwitcher}
          onClose={() => setShowRoleSwitcher(false)}
          currentRole="business"
          targetRole="worker"
        />
      )}
    </div>
  )
}
