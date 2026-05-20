'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, BellOff, ClipboardList, ShoppingCart, Users } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'

// ─── 저장 키 ─────────────────────────────────────────────────
const STORAGE_KEY = 'ilitda_app_notifications'

interface NotifSettings {
  enabled: boolean
  sections: {
    services: boolean
    orders: boolean
    labor: boolean
  }
}

const DEFAULT_SETTINGS: NotifSettings = {
  enabled: true,
  sections: { services: true, orders: true, labor: true },
}

function loadSettings(): NotifSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

// ─── 토글 컴포넌트 ────────────────────────────────────────────
function Toggle({ enabled, onChange, disabled }: {
  enabled: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      aria-pressed={enabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${enabled && !disabled ? 'bg-brand-600' : 'bg-border'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ─── 설정 행 ─────────────────────────────────────────────────
function SettingRow({ icon, title, description, enabled, onChange, disabled }: {
  icon: React.ReactNode
  title: string
  description?: string
  enabled: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-3 transition-opacity ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="text-text-tertiary">{icon}</span>
        <div>
          <p className="text-sm font-medium text-text-primary">{title}</p>
          {description && <p className="text-xs text-text-tertiary mt-0.5">{description}</p>}
        </div>
      </div>
      <Toggle enabled={enabled} onChange={onChange} disabled={disabled} />
    </div>
  )
}

// ─── 메인 ────────────────────────────────────────────────────
export default function AppNotificationsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
    setIsMounted(true)
  }, [])

  const save = (next: NotifSettings) => {
    setSettings(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  const setMaster = (v: boolean) => save({ ...settings, enabled: v })
  const setSection = (key: keyof NotifSettings['sections'], v: boolean) =>
    save({ ...settings, sections: { ...settings.sections, [key]: v } })

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6">
        <div className="h-8 w-40 rounded-lg bg-surface-sunken animate-pulse" />
        <div className="h-32 rounded-2xl bg-surface-sunken animate-pulse" />
        <div className="h-40 rounded-2xl bg-surface-sunken animate-pulse" />
      </div>
    )
  }

  const masterOff = !settings.enabled

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 -ml-1 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <SectionHeader title="알림 설정" level="page" />
      </div>

      {/* 전체 알림 */}
      <div className="bg-surface rounded-2xl border-2 border-border-subtle px-4 py-1 shadow-flat">
        <SettingRow
          icon={settings.enabled ? <Bell size={17} /> : <BellOff size={17} />}
          title="앱 알림"
          description="모든 알림을 한 번에 켜고 끕니다"
          enabled={settings.enabled}
          onChange={setMaster}
        />
      </div>

      {/* 섹션별 알림 */}
      <div className="bg-surface rounded-2xl border-2 border-border-subtle px-4 py-1 shadow-flat">
        <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider pt-3 pb-1">
          페이지별 알림
        </p>
        <div className="flex flex-col divide-y divide-border-subtle">
          <SettingRow
            icon={<ClipboardList size={17} />}
            title="서비스관리"
            description="신청·예약·작업 관련 알림"
            enabled={settings.sections.services}
            onChange={(v) => setSection('services', v)}
            disabled={masterOff}
          />
          <SettingRow
            icon={<ShoppingCart size={17} />}
            title="오더거래"
            description="발주·거래 관련 알림"
            enabled={settings.sections.orders}
            onChange={(v) => setSection('orders', v)}
            disabled={masterOff}
          />
          <SettingRow
            icon={<Users size={17} />}
            title="인력거래"
            description="인력 요청·매칭 관련 알림"
            enabled={settings.sections.labor}
            onChange={(v) => setSection('labor', v)}
            disabled={masterOff}
          />
        </div>
      </div>

      {/* 안내 */}
      <div className="bg-surface-sunken rounded-xl px-4 py-3">
        <p className="text-xs text-text-tertiary leading-relaxed">
          알림 설정은 이 기기에만 저장됩니다. 앱 알림을 끄면 모든 페이지 알림이 비활성화됩니다.
        </p>
      </div>
    </div>
  )
}
