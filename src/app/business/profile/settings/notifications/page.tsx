'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import {
  DEFAULT_NOTIFICATION_CONFIG,
  DEFAULT_MSG_TEMPLATE,
  DEFAULT_PANEL_FIELDS,
  PANEL_SECTIONS,
  SMS_TOKEN_META,
} from '@/lib/settings-defaults'
import type { NotificationConfig, NotificationRule, PanelConfig } from '@/types'

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

const SECTION_LABEL: Record<string, string> = {
  basic:    '기본정보',
  site:     '현장',
  schedule: '일정',
  request:  '요청사항',
  payment:  '결제',
}

// ─── 동적 변수 목록 ────────────────────────────────────────────
interface SmsVar { token: string; label: string; preview: string; section: string }

function buildVarsFromConfig(panelConfig: PanelConfig | null): SmsVar[] {
  return DEFAULT_PANEL_FIELDS
    .filter(f => {
      if (f.readOnly) return false
      if (f.defaultHidden) return false
      if (!(f.key in SMS_TOKEN_META)) return false
      const isHidden = panelConfig?.fields?.[f.key]?.hidden ?? false
      return !isHidden
    })
    .map(f => {
      const override = panelConfig?.fields?.[f.key]
      const label = override?.label?.trim() || f.label
      return {
        token:   `{${f.key}}`,
        label,
        section: f.section,
        preview: SMS_TOKEN_META[f.key].preview,
      }
    })
}

function previewTemplate(template: string, vars: SmsVar[]): string {
  return vars.reduce((t, v) => t.replaceAll(v.token, v.preview), template)
}

// ─── NotificationRuleCard ─────────────────────────────────────
function NotificationRuleCard({
  rule,
  onChange,
  smsVars,
}: {
  rule: NotificationRule
  onChange: (updated: NotificationRule) => void
  smsVars: SmsVar[]
}) {
  const [useCustomTemplate, setUseCustomTemplate] = useState(
    rule.template !== null && rule.template !== undefined,
  )
  const [activeSection, setActiveSection] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const sections = PANEL_SECTIONS
    .map(s => ({
      id:    s.id,
      label: SECTION_LABEL[s.id] ?? s.title,
      vars:  smsVars.filter(v => v.section === s.id),
    }))
    .filter(s => s.vars.length > 0)

  useEffect(() => {
    if (!activeSection && sections.length > 0) {
      setActiveSection(sections[0].id)
    }
  }, [sections.length, activeSection])

  const activeSectionVars = sections.find(s => s.id === activeSection)?.vars ?? []

  // DEFAULT_MSG_TEMPLATE은 영문 단축키 파라미터를 쓰므로 더미 맵 구성
  const dummyParams: Record<string, string> = {
    name:    '스타벅스 판교점',
    date:    '2025-01-15',
    time:    '09:00',
    amount:  '500,000',
    account: '국민은행 123-456',
    contact: '031-759-4877',
  }
  const defaultPreview = DEFAULT_MSG_TEMPLATE[rule.type]
    ? DEFAULT_MSG_TEMPLATE[rule.type](dummyParams)
    : null

  const handleToggleEnabled = () => onChange({ ...rule, enabled: !rule.enabled })

  const handleModeChange = (mode: 'manual' | 'auto') => {
    if (mode === 'manual') {
      onChange({ ...rule, mode, trigger: undefined })
    } else {
      onChange({
        ...rule,
        mode,
        trigger: rule.trigger ?? { base: 'construction_date', offset_days: 0, send_time: '09:00' },
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
    const end   = el.selectionEnd
    const cur   = rule.template ?? ''
    const next  = cur.slice(0, start) + token + cur.slice(end)
    onChange({ ...rule, template: next })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  return (
    <Card padding="md">
      {/* 헤더: 알림 타입 + ON/OFF */}
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
          {/* 수동/자동 모드 */}
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
                {/* 변수 삽입 영역 */}
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-medium text-text-tertiary">
                    변수 삽입 — 탭하면 커서 위치에 추가
                  </p>

                  {/* 카테고리 탭 */}
                  <div className="flex gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                    {sections.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => setActiveSection(s.id)}
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                          activeSection === s.id
                            ? 'bg-brand-600 text-white'
                            : 'bg-surface-sunken text-text-secondary border border-border-subtle hover:border-border'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* 변수 칩 — onMouseDown preventDefault로 포커스 유지 */}
                  <div className="flex flex-wrap gap-1.5">
                    {activeSectionVars.map(v => (
                      <button
                        key={v.token}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => insertVariable(v.token)}
                        className="inline-flex flex-col items-start px-2.5 py-1.5 rounded-xl bg-brand-600/10 text-brand-600 hover:bg-brand-600/20 transition-colors active:scale-95"
                      >
                        <span className="text-[11px] font-semibold leading-none">{v.label}</span>
                        <span className="text-[9px] text-brand-600/60 leading-none mt-0.5">{v.preview}</span>
                      </button>
                    ))}
                    {activeSectionVars.length === 0 && (
                      <p className="text-[11px] text-text-tertiary py-1">표시할 변수가 없습니다.</p>
                    )}
                  </div>
                </div>

                {/* 텍스트에어리어 */}
                <textarea
                  ref={textareaRef}
                  rows={4}
                  value={rule.template ?? ''}
                  onChange={(e) => onChange({ ...rule, template: e.target.value })}
                  placeholder={`예: [일잇다] {business_name} 담당자님, 예약이 확정되었습니다.\n서비스일: {construction_date} {construction_time}`}
                  className="w-full text-sm border border-border-subtle rounded-xl px-3 py-2.5 bg-surface outline-none focus:border-brand-600 resize-y"
                />

                {/* 미리보기 */}
                {rule.template && rule.template.trim() && (
                  <div className="bg-surface-sunken rounded-lg p-2.5">
                    <p className="text-[10px] text-text-tertiary mb-1">미리보기</p>
                    <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed">
                      {previewTemplate(rule.template, smsVars)}
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
  const [config, setConfig]         = useState<NotificationConfig | null>(null)
  const [panelConfig, setPanelConfig] = useState<PanelConfig | null>(null)
  const [isLoading, setIsLoading]   = useState(true)
  const [isSaving, setIsSaving]     = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const smsVars = buildVarsFromConfig(panelConfig)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [notifRes, fieldsRes] = await Promise.all([
          fetch('/api/admin/settings/notifications'),
          fetch('/api/admin/settings/fields'),
        ])
        const [notifJson, fieldsJson] = await Promise.all([
          notifRes.json(),
          fieldsRes.json(),
        ])
        if (notifJson.success) setConfig(notifJson.data as NotificationConfig)
        if (fieldsJson.success && fieldsJson.data?.panelConfig) {
          setPanelConfig(fieldsJson.data.panelConfig as PanelConfig)
        }
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
          smsVars={smsVars}
        />
      ))}

      {saveError   && <p className="text-sm text-state-danger  text-center">{saveError}</p>}
      {saveSuccess && <p className="text-sm text-state-success text-center">저장되었습니다.</p>}
      <Button fullWidth onClick={handleSave} isLoading={isSaving}>저장</Button>
    </div>
  )
}
