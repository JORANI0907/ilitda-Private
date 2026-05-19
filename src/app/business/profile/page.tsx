'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, Phone, MapPin, User,
  Bell, LogOut, ArrowLeftRight, ChevronRight,
  CreditCard, Users,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Modal } from '@/components/ui/Modal'
import { LoginPrompt } from '@/components/shared/LoginPrompt'
import { RoleSwitcher } from '@/components/shared/RoleSwitcher'
import type { Profile, Business } from '@/types'

interface ProfileData {
  profile: Profile
  business: Business | null
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

  const { profile, business } = data
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

      {/* 내 정보 */}
      <Card padding="md">
        <SectionHeader title="사업체 정보" className="mb-3" />
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-text-tertiary shrink-0" />
            <div>
              <p className="text-xs text-text-tertiary mb-0.5">대표 전화</p>
              <p className="text-sm text-text-primary">{profile.phone}</p>
            </div>
          </div>

          {business?.address && (
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-text-tertiary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-text-tertiary mb-0.5">주소</p>
                <p className="text-sm text-text-primary break-keep">{business.address}</p>
              </div>
            </div>
          )}

          {business?.representative_name && (
            <div className="flex items-center gap-3">
              <User size={16} className="text-text-tertiary shrink-0" />
              <div>
                <p className="text-xs text-text-tertiary mb-0.5">대표자</p>
                <p className="text-sm text-text-primary">{business.representative_name}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 역할 전환 */}
      {canSwitchToWorker && (
        <Card
          padding="md"
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
            className="flex items-center justify-between py-3 text-left"
            onClick={() => {/* 알림 설정 — 추후 구현 */}}
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
            onClick={() => {/* 발신번호 설정 — 추후 구현 */}}
          >
            <div className="flex items-center gap-3">
              <CreditCard size={16} className="text-text-tertiary" />
              <span className="text-sm text-text-primary">발신번호 관리</span>
            </div>
            <ChevronRight size={16} className="text-text-tertiary" />
          </button>

          <button
            type="button"
            className="flex items-center justify-between py-3 text-left"
            onClick={() => {/* 직원 권한 설정 — 추후 구현 */}}
          >
            <div className="flex items-center gap-3">
              <Users size={16} className="text-text-tertiary" />
              <span className="text-sm text-text-primary">직원 권한 설정</span>
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
          currentRole="business"
          targetRole="worker"
        />
      )}
    </div>
  )
}
