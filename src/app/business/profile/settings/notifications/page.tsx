'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { HelpTip } from '@/components/ui/HelpTip'
import { HelpIcon } from '@/components/ui/HelpIcon'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import {
  DEFAULT_NOTIFICATION_CONFIG,
  DEFAULT_MSG_TEMPLATE,
  DEFAULT_PANEL_FIELDS,
  PANEL_SECTIONS,
  SMS_TOKEN_META,
} from '@/lib/settings-defaults'
import { toPlanType, canUseFeature } from '@/lib/plan-features'
import type { NotificationConfig, NotificationRule, PanelConfig } from '@/types'
import type { PlanType } from '@/lib/plan-features'

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
  planType,
}: {
  rule: NotificationRule
  onChange: (updated: NotificationRule) => void
  smsVars: SmsVar[]
  planType: PlanType
}) {
  const [useCustomTemplate, setUseCustomTemplate] = useState(
    rule.template !== null && rule.template !== undefined,
  )
  const [activeSection, setActiveSection] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [upgradeModal, setUpgradeModal] = useState<{
    featureName: string
    requiredPlan: PlanType
  } | null>(null)

  const canAutoDispatch  = canUseFeature(planType, 'sms_auto_dispatch')
  const canCustomTemplate = canUseFeature(planType, 'sms_custom_template')

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
    if (mode === 'auto' && !canAutoDispatch) {
      setUpgradeModal({ featureName: '자동 발송', requiredPlan: 'pro' })
      return
    }
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
    if (useCustom && !canCustomTemplate) {
      setUpgradeModal({ featureName: '커스텀 문구', requiredPlan: 'pro' })
      return
    }
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
    <>
    {upgradeModal && (
      <UpgradeModal
        open={!!upgradeModal}
        onClose={() => setUpgradeModal(null)}
        featureName={upgradeModal.featureName}
        requiredPlan={upgradeModal.requiredPlan}
        currentPlan={planType}
      />
    )}
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
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-tertiary">발송 방식</span>
              <HelpIcon
                title="수동 vs 자동 발송"
                description={`수동: 서비스 관리 화면에서 담당자가 직접 버튼을 눌러 문자를 보냅니다.\n\n자동: 서비스일 기준으로 설정한 시점에 시스템이 자동으로 문자를 발송합니다.\n예) 서비스 하루 전 오전 9시 자동 발송`}
              />
            </div>
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
          </div>

          {/* 자동 트리거 설정 */}
          {rule.mode === 'auto' && rule.trigger && (
            <div className="flex flex-col gap-2 bg-surface-sunken rounded-xl p-3">
              <p className="text-xs text-text-tertiary font-medium">기준: 서비스일</p>
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-1">
                  <label className="text-xs text-text-secondary whitespace-nowrap">발송 시점</label>
                  <HelpIcon
                    title="발송 시점이란?"
                    description={`서비스일 기준으로 며칠 전/당일/후에 문자를 보낼지 설정합니다.\n\n예) '1일 전' = 서비스 하루 전날 발송\n예) '당일' = 서비스 당일 발송\n예) '1일 후' = 서비스 다음 날 발송`}
                  />
                </div>
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
                <div className="flex items-center gap-1">
                  <label className="text-xs text-text-secondary whitespace-nowrap">발송 시각</label>
                  <HelpIcon
                    title="발송 시각이란?"
                    description={`문자가 실제로 발송되는 시각입니다.\n\n고객이 확인하기 좋은 오전 9시~10시를 권장합니다.\n너무 이른 새벽이나 늦은 밤은 피하세요.`}
                  />
                </div>
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
              <HelpTip>
                서비스일이 등록된 신청건에만 자동 발송됩니다. 발송 시각은 KST(한국 시간) 기준입니다.
              </HelpTip>
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
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] font-medium text-text-tertiary">
                      변수 삽입 — 탭하면 커서 위치에 추가
                    </p>
                    <HelpIcon
                      title="변수란?"
                      description={`변수를 사용하면 고객별로 문자 내용이 자동으로 채워집니다.\n\n예) {business_name} → 실제 고객사 이름으로 치환\n예) {construction_date} → 실제 서비스 날짜로 치환\n\n변수 목록은 필드 설정에서 활성화된 항목이 자동으로 표시됩니다.`}
                    />
                  </div>
                  <HelpTip>
                    {`{변수명}을 입력하면 실제 고객 정보로 자동 교체됩니다.\n예) {business_name} → '스타벅스 판교점'`}
                  </HelpTip>

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
                  <>
                    <HelpTip>
                      아래 미리보기는 샘플 데이터로 표시됩니다. 실제 발송 시에는 고객 정보로 대체됩니다.
                    </HelpTip>
                    <div className="bg-surface-sunken rounded-lg p-2.5">
                      <p className="text-[10px] text-text-tertiary mb-1">미리보기</p>
                      <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed">
                        {previewTemplate(rule.template, smsVars)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
    </>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function NotificationsSettingsPage() {
  const router = useRouter()
  const [config, setConfig]           = useState<NotificationConfig | null>(null)
  const [panelConfig, setPanelConfig]  = useState<PanelConfig | null>(null)
  const [planType, setPlanType]        = useState<PlanType>('free')
  const [isLoading, setIsLoading]     = useState(true)
  const [isSaving, setIsSaving]       = useState(false)
  const [saveError, setSaveError]     = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess]  = useState(false)
  const [helpOpen, setHelpOpen]        = useState(false)

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
        if (notifJson.success) {
          const { plan_type, ...rest } = notifJson.data as NotificationConfig & { plan_type?: string }
          setConfig(rest as NotificationConfig)
          setPlanType(toPlanType(plan_type))
        }
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

      {/* 페이지 도움말 배너 */}
      <HelpBanner onClick={() => setHelpOpen(true)} />

      {/* 전체 한도 경고 */}
      <HelpTip variant="warning">
        요금제별 일일 SMS 발송 한도가 있습니다. 한도 초과 시 당일 발송이 불가합니다.
      </HelpTip>

      {/* 도움말 Drawer */}
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="알림 설정 사용 방법"
        sections={[
          {
            title: '이 페이지에서 무엇을 설정하나요?',
            content: '고객에게 보내는 SMS 문자 알림을 설정하는 화면입니다.\n각 알림 유형별로 ON/OFF, 수동/자동 발송 방식, 문자 내용을 따로 설정할 수 있습니다.',
          },
          {
            title: '수동 발송이란?',
            content: '서비스 관리 화면에서 담당자가 직접 버튼을 눌러야 문자가 발송됩니다.\n원하는 타이밍에 보낼 수 있어 유연하지만, 잊으면 발송되지 않습니다.',
          },
          {
            title: '자동 발송 설정 방법',
            content: '① 발송 방식에서 "자동"을 선택합니다.\n② 발송 시점: 서비스일 기준 며칠 전/당일/후를 선택합니다.\n   예) "1일 전" = 서비스 하루 전날\n   예) "당일" = 서비스 당일\n③ 발송 시각: 문자가 나가는 정확한 시간을 선택합니다.\n   고객이 읽기 좋은 오전 9시~10시를 권장합니다.\n\n설정 후 반드시 "저장" 버튼을 눌러야 적용됩니다.',
          },
          {
            title: '자동 발송이란?',
            content: '서비스일 기준으로 설정한 시점에 시스템이 자동으로 문자를 보냅니다.\n예) "서비스 1일 전 오전 9시" 설정 시 매일 그 시간에 해당하는 고객에게 자동 발송됩니다.\n\n단, 서비스 신청서에 서비스일이 입력된 건에만 동작합니다.',
          },
          {
            title: '변수 활용 예시',
            content: '변수를 조합하면 고객 맞춤 문자를 자동으로 보낼 수 있습니다.\n\n예시 문자)\n"[일잇다] {business_name} 담당자님,\n{construction_date} {construction_time} 서비스가 확정되었습니다.\n문의: {contact}"\n\n→ 실제 발송 시:\n"[일잇다] 스타벅스 판교점 담당자님,\n2025년 1월 15일 오전 9시 서비스가 확정되었습니다.\n문의: 031-759-4877"',
          },
          {
            title: '변수를 사용하면 무엇이 좋나요?',
            content: '문자 내용에 {business_name}, {construction_date} 같은 변수를 넣으면\n실제 고객 정보가 자동으로 채워져 발송됩니다.\n\n예) "{business_name} 담당자님" → "스타벅스 판교점 담당자님"\n\n변수는 필드 설정에서 활성화한 항목만 표시됩니다.',
          },
          {
            title: '주의사항',
            content: '• 자동 발송은 서비스일이 입력된 신청건에만 동작합니다.\n  서비스일 미입력 시 해당 건은 자동 발송 대상에서 제외됩니다.\n\n• 요금제별 일일 SMS 발송 한도가 있습니다.\n  한도를 초과하면 당일 추가 발송이 불가능합니다.\n  자동 발송이 많은 경우 수동 발송 여유분을 미리 확인하세요.',
          },
          {
            title: 'SMS 발송 한도 주의사항',
            content: '요금제별로 하루에 보낼 수 있는 SMS 건수가 정해져 있습니다.\n한도를 초과하면 당일 추가 발송이 불가능합니다.\n\n자동 발송이 많은 경우 수동 발송 여유분을 고려해 설정하세요.',
          },
        ]}
      />

      {/* 알림 규칙 카드 목록 */}
      {config.rules.map((rule, i) => (
        <NotificationRuleCard
          key={rule.type}
          rule={rule}
          onChange={(updated) => handleRuleChange(i, updated)}
          smsVars={smsVars}
          planType={planType}
        />
      ))}

      {saveError   && <p className="text-sm text-state-danger  text-center">{saveError}</p>}
      {saveSuccess && <p className="text-sm text-state-success text-center">저장되었습니다.</p>}
      <Button fullWidth onClick={handleSave} isLoading={isSaving}>저장</Button>
    </div>
  )
}
