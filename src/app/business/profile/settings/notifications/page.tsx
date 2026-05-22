'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { DEFAULT_NOTIFICATION_CONFIG, DEFAULT_MSG_TEMPLATE } from '@/lib/settings-defaults'
import type { NotificationConfig, NotificationRule } from '@/types'

const SEND_TIME_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const h = (i + 6).toString().padStart(2, '0')
  return `${h}:00`
})

const OFFSET_OPTIONS = Array.from({ length: 15 }, (_, i) => i - 7)

function offsetLabel(n: number): string {
  if (n === 0) return '당일'
  if (n < 0) return `${Math.abs(n)}일 전`
  return `${n}일 후`
}

const DUMMY_PARAMS: Record<string, string> = {
  name: '스타벅스 판교점',
  date: '2025-01-15',
  time: '09:00',
  amount: '500,000',
  account: '국민은행 000-0000-0000',
}

// ─── SMS 변수 정의 ────────────────────────────────────────────
const SMS_VARIABLES: { token: string; label: string; preview: string }[] = [
  { token: '{이름}',      label: '업체명/이름',  preview: '스타벅스 판교점' },
  { token: '{담당자}',    label: '담당자명',     preview: '홍길동' },
  { token: '{연락처}',    label: '연락처',       preview: '010-1234-5678' },
  { token: '{서비스일}',  label: '서비스일',     preview: '2025-01-15' },
  { token: '{시간}',      label: '서비스시간',   preview: '09:00' },
  { token: '{주소}',      label: '주소',         preview: '성남시 분당구' },
  { token: '{서비스내용}',label: '서비스 내용',  preview: '주방 후드, 에어컨 2대' },
  { token: '{금액}',      label: '금액',         preview: '500,000원' },
  { token: '{계좌}',      label: '계좌',         preview: '국민은행 123-456' },
]

function previewTemplate(template: string): string {
  return SMS_VARIABLES.reduce(
    (t, v) => t.replaceAll(v.token, v.preview),
    template,
  )
}

// ─── NotificationRuleCard ─────────────────────────────────────
function NotificationRuleCard({
  rule,
  onChange,
}: {
  rule: NotificationRule
  onChange: (updated: NotificationRule) => void
}) {
  const [useCustomTemplate, setUseCustomTemplate] = useState(
    rule.template !== null && rule.template !== undefined
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const defaultPreview = DEFAULT_MSG_TEMPLATE[rule.type]
    ? DEFAULT_MSG_TEMPLATE[rule.type](DUMMY_PARAMS)
    : null

  const handleToggleEnabled = () => onChange({ ...rule, enabled: !rule.enabled })

  const handleModeChange = (mode: 'manual' | 'auto') => {
    if (mode === 'manual') {
      onChange({ ...rule, mode, trigger: undefined })
    } else {
      onChange({
        ...rule,
        mode,
        trigger: rule.trigger ?? {
          base: 'construction_date',
          offset_days: 0,
          send_time: '09:00',
        },
      })
    }
  }

  const handleTriggerChange = (field: 'offset_days' | 'send_time', value: number | string) => {
    if (!rule.trigger) return
    onChange({ ...rule, trigger: { ...rule.trigger, [field]: value } })
  }

  const handleCustomTemplateToggle = (useCustom: boolean) => {
    setUseCustomTemplate(useCustom)
    onChange({ ...rule, template: useCustom ? (rule.template ?? '') : null })
  }

  function insertVariable(token: string) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const current = rule.template ?? ''
    const next = current.slice(0, start) + token + current.slice(end)
    onChange({ ...rule, template: next })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  return (
    <Card padding="md">
      {/* 헤더: 알림 타입 + ON/OFF 토글 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-text-primary break-keep">{rule.type}</span>
        <button
          type="button"
          onClick={handleToggleEnabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
            rule.enabled ? 'bg-brand-600' : 'bg-border'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              rule.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {rule.enabled && (
        <div className="flex flex-col gap-3">
          {/* 모드 선택 */}
          <div className="flex gap-2">
            {(['manual', 'auto'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleModeChange(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                  rule.mode === m
                    ? 'border-brand-600 bg-brand-50 text-brand-600'
                    : 'border-border-subtle bg-surface text-text-secondary hover:border-border'
                }`}
              >
                {m === 'manual' ? '수동' : '자동'}
              </button>
            ))}
          </div>

          {/* 자동 트리거 설정 */}
          {rule.mode === 'auto' && rule.trigger && (
            <div className="flex flex-col gap-2 bg-surface-sunken rounded-xl p-3">
              <p className="text-xs text-text-tertiary font-medium">기준: 서비스일</p>
              <div className="flex gap-2 items-center">
                <label className="text-xs text-text-secondary whitespace-nowrap">발송 시점</label>
                <select
                  value={rule.trigger.offset_days}
                  onChange={(e) => handleTriggerChange('offset_days', Number(e.target.value))}
                  className="flex-1 text-sm border border-border-subtle rounded-lg px-2 py-1.5 bg-surface outline-none focus:border-brand-600"
                >
                  {OFFSET_OPTIONS.map((n) => (
                    <option key={n} value={n}>{offsetLabel(n)}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-xs text-text-secondary whitespace-nowrap">발송 시각</label>
                <select
                  value={rule.trigger.send_time}
                  onChange={(e) => handleTriggerChange('send_time', e.target.value)}
                  className="flex-1 text-sm border border-border-subtle rounded-lg px-2 py-1.5 bg-surface outline-none focus:border-brand-600"
                >
                  {SEND_TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 문구 설정 */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!useCustomTemplate}
                onChange={(e) => handleCustomTemplateToggle(!e.target.checked)}
                className="w-4 h-4 accent-brand-600"
              />
              <span className="text-xs text-text-secondary">기본 문구 사용</span>
            </label>

            {!useCustomTemplate && defaultPreview && (
              <div className="bg-surface-sunken rounded-lg p-2.5">
                <p className="text-xs text-text-tertiary whitespace-pre-line leading-relaxed">
                  {defaultPreview}
                </p>
              </div>
            )}

            {useCustomTemplate && (
              <div className="flex flex-col gap-2">
                {/* 변수 칩 */}
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-medium text-text-tertiary">변수 클릭 시 커서 위치에 삽입</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SMS_VARIABLES.map((v) => (
                      <button
                        key={v.token}
                        type="button"
                        onClick={() => insertVariable(v.token)}
                        className="inline-flex items-center h-6 px-2 rounded-full bg-brand-600/10 text-brand-600 text-[11px] font-medium hover:bg-brand-600/20 transition-colors active:scale-95"
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 편집 textarea */}
                <textarea
                  ref={textareaRef}
                  rows={4}
                  value={rule.template ?? ''}
                  onChange={(e) => onChange({ ...rule, template: e.target.value })}
                  placeholder={`예: [일잇다] {이름} 담당자님, 예약이 확정되었습니다.\n서비스일: {서비스일} {시간}`}
                  className="w-full text-sm border border-border-subtle rounded-xl px-3 py-2.5 bg-surface outline-none focus:border-brand-600 resize-y"
                />

                {/* 미리보기 */}
                {rule.template && rule.template.trim() && (
                  <div className="bg-surface-sunken rounded-lg p-2.5">
                    <p className="text-[10px] text-text-tertiary mb-1">미리보기</p>
                    <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed">
                      {previewTemplate(rule.template)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function NotificationsSettingsPage() {
  const router = useRouter()
  const [config, setConfig] = useState<NotificationConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/admin/settings/notifications')
        const json = await res.json()
        if (json.success) setConfig(json.data as NotificationConfig)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleRuleChange = (index: number, updated: NotificationRule) => {
    if (!config) return
    const rules = config.rules.map((r, i) => (i === index ? updated : r))
    setConfig({ ...config, rules })
  }

  const handleReset = () => {
    if (!confirm('모든 알림 설정을 기본값으로 초기화하시겠습니까?')) return
    setConfig({ rules: DEFAULT_NOTIFICATION_CONFIG.rules.map((r) => ({ ...r })) })
  }

  const handleSave = async () => {
    if (!config) return
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch('/api/admin/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const json = await res.json()
      if (!json.success) {
        setSaveError(json.error ?? '저장에 실패했습니다.')
        return
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch {
      setSaveError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6">
        <div className="h-8 w-40 rounded-lg bg-surface-sunken animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-surface-sunken animate-pulse" />
        ))}
      </div>
    )
  }

  if (!config) {
    return (
      <div className="px-4 pt-6 text-center text-text-secondary text-sm">
        설정을 불러오지 못했습니다.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-24">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1 -ml-1 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <SectionHeader title="알림 설정" level="page" />
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-state-danger transition-colors"
        >
          <RotateCcw size={14} />
          기본값으로 초기화
        </button>
      </div>

      {/* 알림 규칙 카드 목록 */}
      {config.rules.map((rule, i) => (
        <NotificationRuleCard
          key={rule.type}
          rule={rule}
          onChange={(updated) => handleRuleChange(i, updated)}
        />
      ))}

      {saveError && <p className="text-sm text-state-danger text-center">{saveError}</p>}
      {saveSuccess && <p className="text-sm text-state-success text-center">저장되었습니다.</p>}
      <Button fullWidth onClick={handleSave} isLoading={isSaving}>저장</Button>
    </div>
  )
}
