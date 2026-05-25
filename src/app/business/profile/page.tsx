'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, Sparkles,
  Bell, LogOut, ArrowLeftRight, ChevronRight, ChevronLeft, ChevronDown,
  CreditCard, Users, Link2, Copy, Check, SlidersHorizontal, ShieldCheck, BookOpen, BarChart2,
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Modal } from '@/components/ui/Modal'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { LoginPrompt } from '@/components/shared/LoginPrompt'
import { RoleSwitcher } from '@/components/shared/RoleSwitcher'
import { PLAN_SMS_LIMITS, type Profile, type Business, type Worker } from '@/types'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import { canUseFeature, toPlanType, PLAN_FEATURES } from '@/lib/plan-features'
import type { PlanType, PlanFeatureMap } from '@/lib/plan-features'

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

  const [showHelpDrawer, setShowHelpDrawer] = useState(false)
  const [planFeatures, setPlanFeatures] = useState<Record<PlanType, PlanFeatureMap>>(PLAN_FEATURES)

  const [slug, setSlug] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  // 앱 이름 관련 상태
  const [appDisplayName, setAppDisplayName] = useState('')
  const [appDisplayNameInput, setAppDisplayNameInput] = useState('')
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false)
  const [displayNameError, setDisplayNameError] = useState<string | null>(null)
  const [appNameUpgradeOpen, setAppNameUpgradeOpen] = useState(false)
  const [showMemberInfo, setShowMemberInfo] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)
      try {
        const [profileRes, featuresRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/plan-features', { cache: 'no-store' }),
        ])
        if (profileRes.status === 401) {
          setIsUnauthorized(true)
          setShowLoginPrompt(true)
          return
        }
        const [profileJson, featuresJson] = await Promise.all([
          profileRes.json(),
          featuresRes.json(),
        ])
        if (profileJson.success) {
          setData(profileJson.data)
          setSlug(profileJson.data.business?.request_slug ?? '')
          const displayName = profileJson.data.business?.app_display_name ?? ''
          setAppDisplayName(displayName)
          setAppDisplayNameInput(displayName)
          setDataLoaded(true)
        }
        if (featuresJson.success && featuresJson.data) {
          setPlanFeatures(featuresJson.data as Record<PlanType, PlanFeatureMap>)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [])

  useEffect(() => {
    if (!dataLoaded) return
    const hash = window.location.hash
    if (!hash) return
    const el = document.querySelector(hash)
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [dataLoaded])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // 네트워크 오류여도 로그아웃 처리 계속 진행
    } finally {
      window.location.replace('/login')
    }
  }

  const handleSaveDisplayName = async () => {
    if (!canUseFeature(toPlanType(data?.business?.plan_type), 'app_name_custom', planFeatures)) {
      setAppNameUpgradeOpen(true)
      return
    }
    const trimmed = appDisplayNameInput.trim()
    if (trimmed.length > 20) {
      setDisplayNameError('20자 이내로 입력해 주세요.')
      return
    }
    setDisplayNameError(null)
    setIsSavingDisplayName(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_display_name: trimmed || null }),
      })
      const json = await res.json()
      if (!json.success) {
        setDisplayNameError(json.error ?? '저장에 실패했습니다.')
        return
      }
      setAppDisplayName(trimmed)
    } catch {
      setDisplayNameError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSavingDisplayName(false)
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1 text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <SectionHeader title="프로필" level="page" />
        </div>
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
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <SectionHeader title="프로필" level="page" />
      </div>

      {/* 도움말 배너 */}
      <HelpBanner
        label="프로필 페이지 사용 방법 보기"
        onClick={() => setShowHelpDrawer(true)}
      />

      {/* 도움말 드로어 */}
      <HelpDrawer
        open={showHelpDrawer}
        onClose={() => setShowHelpDrawer(false)}
        title="프로필 페이지 안내"
        sections={[
          {
            title: '구독 플랜 확인 및 업그레이드',
            content: '화면 중간의 파란색 배너를 탭하면 현재 구독 플랜을 확인하고 업그레이드할 수 있습니다.\n\nFree → Basic → Pro → Max 순서로 업그레이드할수록 더 많은 기능과 알림 발송 횟수를 사용할 수 있습니다.',
          },
          {
            title: '앱 설정 변경 방법',
            content: '아래쪽 "설정" 섹션에서 알림 설정, 발신번호·드라이브 연동, 직원 권한 설정을 변경할 수 있습니다.\n\n각 항목을 탭하면 해당 설정 화면으로 이동합니다.',
          },
          {
            title: '관리자 패널 접근 방법',
            content: '관리자 계정으로 로그인한 경우 화면 하단에 "관리자 패널" 섹션이 표시됩니다.\n\n대시보드, 계정 관리, 입금 확인 기능을 이용할 수 있습니다.',
          },
        ]}
      />

      {/* 사업체 헤더 */}
      <Card padding="md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-light flex items-center justify-center shrink-0">
            <Building2 size={28} className="text-brand-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-text-primary truncate">
              {business?.business_name ?? profile.name}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-600 text-white">
                <Sparkles size={10} />
                {PLAN_LABEL[business?.plan ?? 'free']} 플랜
              </span>
              <button
                type="button"
                onClick={() => router.push('/business/settings/plan')}
                className="inline-flex items-center gap-0.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
              >
                플랜 보러가기
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* 앱 이름 설정 */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-3">
          <SectionHeader title="앱 이름 설정" />
          {!canUseFeature(toPlanType(business?.plan_type), 'app_name_custom', planFeatures) && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              맥스 플랜
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-text-secondary break-keep">
            앱이름을 변경하고 고객에게 신뢰를 높이세요(신청서, 앱 이름 변경)
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="일잇다 (기본값)"
                value={appDisplayNameInput}
                onChange={(e) => setAppDisplayNameInput(e.target.value)}
                maxLength={20}
                disabled={!canUseFeature(toPlanType(business?.plan_type), 'app_name_custom', planFeatures)}
              />
            </div>
            <Button size="md" onClick={handleSaveDisplayName} isLoading={isSavingDisplayName}>
              저장
            </Button>
          </div>
          {displayNameError && (
            <p className="text-sm text-state-danger">{displayNameError}</p>
          )}
          {appDisplayName && (
            <p className="text-xs text-text-tertiary">
              현재 표시 이름: <span className="text-brand-600 font-medium">{appDisplayName}</span>
            </p>
          )}
        </div>
      </Card>

      {/* 오늘 SMS 발송량 현황 */}
      {business && (() => {
        const plan = business.plan_type ?? 'free'
        const limit = PLAN_SMS_LIMITS[plan] ?? PLAN_SMS_LIMITS.free
        const used = business.daily_sms_count ?? 0
        const usedRatio = Math.min(used / limit, 1)
        return (
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart2 size={16} className="text-brand-600" />
                <SectionHeader title="오늘 SMS 발송량 현황" />
              </div>
              <button
                type="button"
                onClick={() => router.push('/business/settings/plan')}
                className="text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors"
              >
                발송량 업그레이드
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-tertiary">오늘 발송</span>
                <span className="text-sm font-medium text-text-primary">{used} / {limit === Number.MAX_SAFE_INTEGER ? '무제한' : `${limit}건`}</span>
              </div>
              <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usedRatio >= 0.9 ? 'bg-state-danger' : usedRatio >= 0.7 ? 'bg-state-warning' : 'bg-brand-600'}`}
                  style={{ width: `${limit === Number.MAX_SAFE_INTEGER ? 0 : usedRatio * 100}%` }}
                />
              </div>
              {usedRatio >= 1 && (
                <p className="text-xs text-state-danger">오늘 발송 한도에 도달했습니다. 내일 초기화됩니다.</p>
              )}
            </div>
          </Card>
        )
      })()}

      {/* 가입 정보 */}
      <Card padding="md">
        <button
          type="button"
          onClick={() => setShowMemberInfo(v => !v)}
          className="flex items-center justify-between w-full"
        >
          <SectionHeader title="가입 정보" />
          <ChevronDown
            size={16}
            className={`text-text-tertiary transition-transform duration-200 ${showMemberInfo ? 'rotate-180' : ''}`}
          />
        </button>
        <div className={`overflow-hidden transition-all duration-200 ${showMemberInfo ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
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
              <div>
                <span className="text-sm text-text-primary">앱 알림설정</span>
                <p className="text-xs text-text-tertiary mt-0.5">앱 내 활동 알림 수신 on/off 관리</p>
              </div>
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
        </div>
      </Card>

      {/* 서비스 설정 */}
      <Card padding="md" className="bg-amber-50">
        <SectionHeader title="서비스 설정" className="mb-3" />
        <div className="flex flex-col divide-y divide-border-subtle">
          <button
            type="button"
            className="flex items-center justify-between py-3 text-left cursor-pointer hover:bg-amber-100/60 active:bg-amber-100 transition-colors"
            onClick={() => router.push('/business/profile/settings/fields')}
          >
            <div className="flex items-center gap-3">
              <SlidersHorizontal size={16} className="text-text-tertiary" />
              <div>
                <span className="text-sm text-text-primary">서비스(폼) 화면 구성 설정</span>
                <p className="text-xs text-text-tertiary mt-0.5">서비스관리(폼)에서 사용할 화면을 직접 커스텀</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-text-tertiary" />
          </button>
          <button
            type="button"
            className="flex items-center justify-between py-3 text-left cursor-pointer hover:bg-amber-100/60 active:bg-amber-100 transition-colors"
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
        </div>
      </Card>

      {/* 신청서 링크 */}
      <Card padding="md" id="request-link-section">
        <SectionHeader title="고객용 신청서 폼 링크" className="mb-3" />
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-tertiary">고객 신청서 작성 → 일정에 자동등록</p>
          {slug ? (
            <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2.5">
              <Link2 size={14} className="text-brand-500 shrink-0" />
              <p className="text-xs text-brand-700 break-all flex-1 min-w-0">
                {typeof window !== 'undefined' ? window.location.origin : 'https://ilitda.vercel.app'}/request/{slug}
              </p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="shrink-0 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
              >
                {isCopied ? <Check size={13} /> : <Copy size={13} />}
                {isCopied ? '복사됨' : '복사'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-text-tertiary text-center py-1">
              신청 링크가 설정되지 않았습니다.
            </p>
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
            <button
              type="button"
              className="flex items-center justify-between py-3 text-left cursor-pointer hover:bg-surface-sunken active:bg-border transition-colors"
              onClick={() => router.push('/admin/policy')}
            >
              <div className="flex items-center gap-3">
                <BookOpen size={16} className="text-text-tertiary" />
                <div>
                  <span className="text-sm text-text-primary">운영 정책</span>
                  <p className="text-xs text-text-tertiary mt-0.5">플랜 결제 정책 · 처리 기준</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-text-tertiary" />
            </button>
            <button
              type="button"
              className="flex items-center justify-between py-3 text-left cursor-pointer hover:bg-surface-sunken active:bg-border transition-colors"
              onClick={() => router.push('/admin/plans')}
            >
              <div className="flex items-center gap-3">
                <SlidersHorizontal size={16} className="text-text-tertiary" />
                <div>
                  <span className="text-sm text-text-primary">플랜 기능 관리</span>
                  <p className="text-xs text-text-tertiary mt-0.5">플랜별 기능 권한 수정 · 통제</p>
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

      <UpgradeModal
        open={appNameUpgradeOpen}
        onClose={() => setAppNameUpgradeOpen(false)}
        featureName="앱 이름 커스텀"
        requiredPlan="max"
        currentPlan={toPlanType(business?.plan_type)}
      />

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
