'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Phone, Wallet, MapPin, Star,
  Bell, LogOut, ArrowLeftRight, ChevronRight,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Modal } from '@/components/ui/Modal'
import { LoginPrompt } from '@/components/shared/LoginPrompt'
import { RoleSwitcher } from '@/components/shared/RoleSwitcher'
import type { Profile, Worker } from '@/types'

interface ProfileData {
  profile: Profile
  worker: Worker | null
}

export default function WorkerProfilePage() {
  const router = useRouter()
  const [data, setData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUnauthorized, setIsUnauthorized] = useState(false)

  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
      // 쿠키 기반 세션 삭제 → 로그인 페이지로 이동
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } finally {
      setIsLoggingOut(false)
      setShowLogoutModal(false)
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

  const { profile, worker } = data
  const canSwitchToBusiness = profile.is_business

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      {/* 프로필 헤더 */}
      <Card padding="md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-light flex items-center justify-center shrink-0">
            <User size={28} className="text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-text-primary truncate">{profile.name}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <Star size={12} fill="currentColor" className="text-state-warning" />
                {profile.rating_avg > 0 ? profile.rating_avg.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-text-tertiary">|</span>
              <span className="text-xs text-text-secondary">
                총 {profile.rating_count}건 작업
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 내 정보 */}
      <Card padding="md">
        <SectionHeader title="내 정보" className="mb-3" />
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-text-tertiary shrink-0" />
            <div>
              <p className="text-xs text-text-tertiary mb-0.5">전화번호</p>
              <p className="text-sm text-text-primary">{profile.phone}</p>
            </div>
          </div>

          {worker?.account_bank && worker?.account_number && (
            <div className="flex items-center gap-3">
              <Wallet size={16} className="text-text-tertiary shrink-0" />
              <div>
                <p className="text-xs text-text-tertiary mb-0.5">계좌</p>
                <p className="text-sm text-text-primary">
                  {worker.account_bank} {worker.account_number}
                </p>
              </div>
            </div>
          )}

          {worker?.available_regions && worker.available_regions.length > 0 && (
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-text-tertiary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-text-tertiary mb-0.5">활동 가능 지역</p>
                <p className="text-sm text-text-primary break-keep">
                  {worker.available_regions.join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 역할 전환 */}
      {canSwitchToBusiness && (
        <Card
          padding="md"
          onClick={() => setShowRoleSwitcher(true)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ArrowLeftRight size={18} className="text-brand-600" />
              <div>
                <p className="font-medium text-text-primary">사업자로 전환</p>
                <p className="text-xs text-text-secondary mt-0.5">사업자 모드로 전환합니다</p>
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
            className="flex items-center justify-between py-3 text-left"
            onClick={() => {/* 알림 설정 페이지 — 추후 구현 */}}
          >
            <div className="flex items-center gap-3">
              <Bell size={16} className="text-text-tertiary" />
              <span className="text-sm text-text-primary">알림 설정</span>
            </div>
            <ChevronRight size={16} className="text-text-tertiary" />
          </button>

          <button
            type="button"
            className="flex items-center justify-between py-3 text-left"
            onClick={() => {/* 계좌 수정 — 추후 구현 */}}
          >
            <div className="flex items-center gap-3">
              <Wallet size={16} className="text-text-tertiary" />
              <span className="text-sm text-text-primary">계좌 수정</span>
            </div>
            <ChevronRight size={16} className="text-text-tertiary" />
          </button>
        </div>
      </Card>

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
          currentRole="worker"
          targetRole="business"
        />
      )}
    </div>
  )
}
