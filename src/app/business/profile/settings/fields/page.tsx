'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, GripVertical, Plus, X, SlidersHorizontal } from 'lucide-react'
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  useSortable, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'
import {
  DEFAULT_PANEL_FIELDS, PANEL_SECTIONS,
  SECTION_BORDER_COLOR, SECTION_TITLE_COLOR,
  DEFAULT_FORM_CONFIG,
} from '@/lib/settings-defaults'
import type { FormConfig, PanelConfig, PanelFieldOverride } from '@/types'

// ─── 상수 ─────────────────────────────────────────────────────
const FORM_ALWAYS_KEYS = new Set([
  'business_name', 'phone', 'address',
  'care_scope', 'request_notes',
])

const FORM_TOGGLE_KEYS = new Set(Object.keys(DEFAULT_FORM_CONFIG.show_fields))

const SECTION_MAP = Object.fromEntries(PANEL_SECTIONS.map(s => [s.id, s]))
const FIELD_MAP = Object.fromEntries(DEFAULT_PANEL_FIELDS.map(f => [f.key, f]))
const DEFAULT_SECTION_ORDER = PANEL_SECTIONS.map(s => s.id)

function buildDefaultFieldOrder(): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const s of PANEL_SECTIONS) {
    result[s.id] = DEFAULT_PANEL_FIELDS
      .filter(f => f.section === s.id && !f.readOnly)
      .map(f => f.key)
  }
  return result
}
const DEFAULT_FIELD_ORDER = buildDefaultFieldOrder()

// ─── Toggle ───────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-border'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

// ─── 컬럼 헤더 ───────────────────────────────────────────────
function ColumnHeader() {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border-subtle">
      <span className="flex-1 text-[10px] font-bold text-text-tertiary uppercase tracking-wider">표시 이름 / 예시 내용</span>
      <span className="w-12 text-center text-[10px] font-bold text-text-tertiary uppercase tracking-wider shrink-0">폼</span>
      <span className="w-14 text-center text-[10px] font-bold text-text-tertiary uppercase tracking-wider shrink-0">서비스관리</span>
    </div>
  )
}

// ─── OptionsEditor ────────────────────────────────────────────
function OptionsEditor({ options, onChange }: { options: string[]; onChange: (o: string[]) => void }) {
  const [newOpt, setNewOpt] = useState('')
  function addOption() {
    const t = newOpt.trim()
    if (!t || options.includes(t)) { setNewOpt(''); return }
    onChange([...options, t])
    setNewOpt('')
  }
  return (
    <div className="flex flex-col gap-1.5 bg-surface-sunken rounded-lg p-2">
      <p className="text-[10px] text-text-tertiary font-medium">드롭다운 옵션</p>
      <div className="flex flex-wrap gap-1 min-h-5">
        {options.length === 0 && <span className="text-[11px] text-text-tertiary">옵션 없음</span>}
        {options.map((opt, i) => (
          <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-surface text-[11px] text-text-primary border border-border-subtle">
            {opt}
            <button type="button" onClick={() => onChange(options.filter((_, j) => j !== i))} className="text-text-tertiary hover:text-state-danger transition-colors ml-0.5">
              <X size={9} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          type="text" value={newOpt} placeholder="옵션 추가..."
          onChange={e => setNewOpt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
          className="flex-1 h-7 rounded-md bg-surface border border-border text-xs px-2.5 focus:outline-none focus:ring-1 focus:ring-brand-500/30 focus:border-brand-500"
        />
        <button type="button" onClick={addOption} className="h-7 px-2 rounded-md bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors">
          <Plus size={11} />
        </button>
      </div>
    </div>
  )
}

// ─── FieldTableRow ────────────────────────────────────────────
interface FieldTableRowProps {
  fieldKey: string
  override: PanelFieldOverride
  onOverrideChange: (patch: Partial<PanelFieldOverride>) => void
  formState: 'always' | 'on' | 'off' | 'none'
  onFormToggle?: (v: boolean) => void
}

function FieldTableRow({ fieldKey, override, onOverrideChange, formState, onFormToggle }: FieldTableRowProps) {
  const def = FIELD_MAP[fieldKey]
  const isHidden = override.hidden ?? def?.defaultHidden ?? false
  const isDropdown = def?.type === 'dropdown'
  const isDateOrTime = def?.type === 'date' || def?.type === 'time'
  const isTextLike = def && (def.type === 'text' || def.type === 'number' || def.type === 'textarea')
  const isReadOnly = def?.readOnly
  const currentLabel = override.label ?? def?.label ?? fieldKey
  const currentPlaceholder = override.placeholder ?? def?.placeholder ?? ''
  const currentOptions = override.options ?? def?.options ?? []

  return (
    <div className={`flex items-start gap-2 py-2.5 border-b border-border-subtle last:border-0 transition-opacity ${isHidden ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {/* 표시 이름 */}
        <input
          type="text"
          value={currentLabel}
          onChange={e => onOverrideChange({ label: e.target.value })}
          placeholder={def?.label ?? fieldKey}
          disabled={isReadOnly}
          className="w-full h-8 rounded-md bg-surface border border-border text-sm text-text-primary px-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* 예시 내용 — text/number/textarea만 */}
        {isTextLike && !isReadOnly && (
          <input
            type="text"
            value={currentPlaceholder}
            onChange={e => onOverrideChange({ placeholder: e.target.value })}
            placeholder="예시 내용 (입력 힌트)"
            className="w-full h-7 rounded-md bg-surface-sunken border border-border-subtle text-xs text-text-secondary px-2.5 focus:outline-none focus:ring-1 focus:ring-brand-500/30 focus:border-brand-500"
          />
        )}

        {/* 드롭다운 옵션 편집 */}
        {isDropdown && !isReadOnly && (
          <OptionsEditor options={currentOptions} onChange={opts => onOverrideChange({ options: opts })} />
        )}

        {/* 날짜/시간 안내 */}
        {isDateOrTime && (
          <p className="text-[10px] text-text-tertiary leading-relaxed">📅 날짜/시간은 앱에서 자동으로 선택기를 제공합니다.</p>
        )}

        {/* 자동계산 필드 안내 */}
        {isReadOnly && (
          <p className="text-[10px] text-text-tertiary">자동 계산 필드 (직접 입력 불가)</p>
        )}
      </div>

      {/* 폼 */}
      <div className="w-12 flex justify-center shrink-0 pt-1.5">
        {formState === 'always' && (
          <span className="text-[10px] font-medium text-brand-600 bg-brand-600/10 px-1.5 py-0.5 rounded-full">항상</span>
        )}
        {(formState === 'on' || formState === 'off') && onFormToggle && (
          <Toggle checked={formState === 'on'} onChange={onFormToggle} />
        )}
        {formState === 'none' && <span className="text-text-tertiary text-sm select-none">─</span>}
      </div>

      {/* 서비스관리 */}
      <div className="w-14 flex justify-center shrink-0 pt-1.5">
        {isReadOnly
          ? <span className="text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">항상</span>
          : <Toggle checked={!isHidden} onChange={v => onOverrideChange({ hidden: !v })} />
        }
      </div>
    </div>
  )
}

// ─── SortableFieldRow (순서 편집 모드) ────────────────────────
function SortableFieldRow({ fieldKey, override, customFormFields }: { fieldKey: string; override: PanelFieldOverride; customFormFields: string[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fieldKey })
  const def = FIELD_MAP[fieldKey]
  const isHidden = override.hidden ?? def?.defaultHidden ?? false
  const currentLabel = (override.label?.trim() || def?.label) ?? fieldKey
  const isInForm = FORM_ALWAYS_KEYS.has(fieldKey) || FORM_TOGGLE_KEYS.has(fieldKey) || customFormFields.includes(fieldKey)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 py-2.5 border-b border-border-subtle last:border-0 ${isDragging || isHidden ? 'opacity-50' : ''}`}
    >
      <button type="button" className="cursor-grab shrink-0 text-text-tertiary touch-none active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </button>
      <span className={`flex-1 text-sm ${isHidden ? 'text-text-tertiary' : 'text-text-primary'}`}>{currentLabel}</span>
      <div className="flex gap-1 shrink-0">
        {isHidden ? (
          <span className="text-[10px] font-medium text-text-tertiary bg-surface-sunken px-1.5 py-0.5 rounded-full border border-border-subtle">숨김</span>
        ) : (
          <>
            {isInForm
              ? <span className="text-[10px] font-medium text-brand-600 bg-brand-600/10 px-1.5 py-0.5 rounded-full">폼</span>
              : <span className="text-[10px] font-medium text-text-tertiary bg-surface-sunken px-1.5 py-0.5 rounded-full border border-border-subtle">관리전용</span>
            }
            <span className="text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">관리화면</span>
          </>
        )}
      </div>
    </div>
  )
}

// ─── SectionBlock ─────────────────────────────────────────────
interface SectionBlockProps {
  sectionId: string
  fieldKeys: string[]
  editOrder: boolean
  panelOverrides: Record<string, PanelFieldOverride>
  formShowFields: Record<string, boolean>
  customFormFields: string[]
  onOverrideChange: (key: string, patch: Partial<PanelFieldOverride>) => void
  onFormToggle: (key: string, v: boolean) => void
  onFieldDragEnd: (sectionId: string, e: DragEndEvent) => void
  dragHandle?: React.ReactNode
}

function SectionBlock({
  sectionId, fieldKeys, editOrder,
  panelOverrides, formShowFields, customFormFields,
  onOverrideChange, onFormToggle, onFieldDragEnd,
  dragHandle,
}: SectionBlockProps) {
  const innerSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const section = SECTION_MAP[sectionId]
  const fields = fieldKeys.filter(k => FIELD_MAP[k])
  if (!section || fields.length === 0) return null

  const borderColor = SECTION_BORDER_COLOR[section.color] ?? 'border-gray-200'
  const titleColor = SECTION_TITLE_COLOR[section.color] ?? 'text-gray-500'

  return (
    <div>
      <div className="flex items-center gap-2 pt-4 pb-1.5">
        {dragHandle}
        <p className={`text-xs font-bold uppercase tracking-wider ${titleColor}`}>{section.title}</p>
      </div>
      <div className={`bg-surface rounded-2xl border-2 ${borderColor} px-3 shadow-flat`}>
        {!editOrder && <ColumnHeader />}
        {editOrder ? (
          <DndContext sensors={innerSensors} collisionDetection={closestCenter} onDragEnd={e => onFieldDragEnd(sectionId, e)}>
            <SortableContext items={fieldKeys} strategy={verticalListSortingStrategy}>
              {fields.map(key => <SortableFieldRow key={key} fieldKey={key} override={panelOverrides[key] ?? {}} customFormFields={customFormFields} />)}
            </SortableContext>
          </DndContext>
        ) : (
          fields.map(key => {
            const def = FIELD_MAP[key]
            if (!def) return null
            const override = panelOverrides[key] ?? {}
            const isSpare = FIELD_MAP[key]?.defaultHidden === true
            const formState: 'always' | 'on' | 'off' | 'none' =
              FORM_ALWAYS_KEYS.has(key) ? 'always' :
              FORM_TOGGLE_KEYS.has(key) ? (formShowFields[key] !== false ? 'on' : 'off') :
              isSpare ? (customFormFields.includes(key) ? 'on' : 'off') :
              'none'
            return (
              <FieldTableRow
                key={key}
                fieldKey={key}
                override={override}
                onOverrideChange={patch => onOverrideChange(key, patch)}
                formState={formState}
                onFormToggle={(FORM_TOGGLE_KEYS.has(key) || isSpare) ? v => onFormToggle(key, v) : undefined}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── SortableSectionBlock ─────────────────────────────────────
function SortableSectionBlock(props: Omit<SectionBlockProps, 'dragHandle'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.sectionId })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? 'opacity-50' : ''}>
      <SectionBlock
        {...props}
        dragHandle={
          <button type="button" className="cursor-grab shrink-0 text-text-tertiary touch-none active:cursor-grabbing" {...attributes} {...listeners}>
            <GripVertical size={16} />
          </button>
        }
      />
    </div>
  )
}

// ─── 결제 방법 에디터 ─────────────────────────────────────────
function PaymentOptionsEditor({ options, onChange }: { options: string[]; onChange: (o: string[]) => void }) {
  const [newOpt, setNewOpt] = useState('')
  function add() {
    const t = newOpt.trim()
    if (!t || options.includes(t)) { setNewOpt(''); return }
    onChange([...options, t])
    setNewOpt('')
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5 min-h-6">
        {options.length === 0 && <span className="text-xs text-text-tertiary">옵션 없음</span>}
        {options.map((opt, i) => (
          <span key={i} className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-surface-sunken text-xs text-text-primary border border-border-subtle">
            {opt}
            <button type="button" onClick={() => onChange(options.filter((_, j) => j !== i))} className="text-text-tertiary hover:text-state-danger ml-0.5">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text" value={newOpt} placeholder="새 결제 방법 추가"
          onChange={e => setNewOpt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          className="flex-1 h-9 rounded-md bg-surface border border-border text-sm px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        />
        <button type="button" onClick={add} className="h-9 px-3 rounded-md bg-surface-sunken border border-border text-text-secondary hover:text-text-primary transition-colors">
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function FieldsSettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [editOrder, setEditOrder] = useState(false)
  const [showHelpDrawer, setShowHelpDrawer] = useState(false)

  const [formShowFields, setFormShowFields] = useState<Record<string, boolean>>(DEFAULT_FORM_CONFIG.show_fields)
  const [workerNotifyFields, setWorkerNotifyFields] = useState<string[]>(DEFAULT_FORM_CONFIG.worker_notify_fields)
  const [paymentOptions, setPaymentOptions] = useState<string[]>(DEFAULT_FORM_CONFIG.payment_options)
  const [heroSubtitle, setHeroSubtitle] = useState(DEFAULT_FORM_CONFIG.hero_subtitle)

  const [customFormFields, setCustomFormFields] = useState<string[]>([])

  const [panelOverrides, setPanelOverrides] = useState<Record<string, PanelFieldOverride>>({})
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER)
  const [fieldOrder, setFieldOrder] = useState<Record<string, string[]>>(DEFAULT_FIELD_ORDER)

  const outerSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/admin/settings/fields')
        const json = await res.json()
        if (json.success && json.data) {
          const { formConfig, panelConfig: pc } = json.data as { formConfig: FormConfig; panelConfig: PanelConfig }
          setFormShowFields({ ...DEFAULT_FORM_CONFIG.show_fields, ...formConfig.show_fields })
          setWorkerNotifyFields(formConfig.worker_notify_fields ?? DEFAULT_FORM_CONFIG.worker_notify_fields)
          setPaymentOptions(formConfig.payment_options ?? DEFAULT_FORM_CONFIG.payment_options)
          setHeroSubtitle(formConfig.hero_subtitle ?? DEFAULT_FORM_CONFIG.hero_subtitle)
          setCustomFormFields(formConfig.custom_form_fields ?? [])
          const safe = pc?.fields ? pc : { fields: {} }
          const overrides: Record<string, PanelFieldOverride> = {}
          for (const [k, v] of Object.entries(safe.fields)) {
            overrides[k] = { ...v }
          }
          setPanelOverrides(overrides)
          if (safe.order?.sections?.length) setSectionOrder(safe.order.sections)
          if (safe.order?.fields) {
            setFieldOrder(prev => {
              const merged: Record<string, string[]> = {}
              for (const sectionId of Object.keys(prev)) {
                const saved = safe.order!.fields![sectionId]
                if (saved) {
                  // 저장된 순서 유지 + 이후 추가된 새 필드는 맨 뒤에 추가
                  const newKeys = prev[sectionId].filter(k => !saved.includes(k))
                  merged[sectionId] = [...saved, ...newKeys]
                } else {
                  merged[sectionId] = prev[sectionId]
                }
              }
              return merged
            })
          }
        }
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  function handleOverrideChange(key: string, patch: Partial<PanelFieldOverride>) {
    setPanelOverrides(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), ...patch },
    }))
  }

  function handleFormToggle(key: string, value: boolean) {
    if (FIELD_MAP[key]?.defaultHidden) {
      setCustomFormFields(prev => value ? [...prev, key] : prev.filter(k => k !== key))
    } else {
      setFormShowFields(prev => ({ ...prev, [key]: value }))
    }
  }

  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setSectionOrder(prev => arrayMove(prev, prev.indexOf(active.id as string), prev.indexOf(over.id as string)))
    }
  }

  function handleFieldDragEnd(sectionId: string, event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setFieldOrder(prev => {
        const keys = prev[sectionId] ?? []
        return { ...prev, [sectionId]: arrayMove(keys, keys.indexOf(active.id as string), keys.indexOf(over.id as string)) }
      })
    }
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const fields: PanelConfig['fields'] = {}
      for (const [key, override] of Object.entries(panelOverrides)) {
        if (Object.keys(override).length > 0) fields[key] = override
      }

      const res = await fetch('/api/admin/settings/fields', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formConfig: {
            payment_options: paymentOptions,
            show_fields: formShowFields as FormConfig['show_fields'],
            worker_notify_fields: workerNotifyFields,
            hero_subtitle: heroSubtitle,
            custom_form_fields: customFormFields,
          } satisfies FormConfig,
          panelConfig: {
            fields,
            order: { sections: sectionOrder, fields: fieldOrder },
          } satisfies PanelConfig,
        }),
      })
      const json = await res.json()
      if (!json.success) { setSaveError(json.error ?? '저장에 실패했습니다.'); return }
      setEditOrder(false)
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
        {[0, 1, 2].map(i => <div key={i} className="h-36 rounded-2xl bg-surface-sunken animate-pulse" />)}
      </div>
    )
  }

  const commonSectionProps = {
    editOrder, panelOverrides, formShowFields, customFormFields,
    onOverrideChange: handleOverrideChange,
    onFormToggle: handleFormToggle,
    onFieldDragEnd: handleFieldDragEnd,
  }

  return (
    <div className="flex flex-col px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={() => router.back()} className="p-1 -ml-1 text-text-tertiary hover:text-text-primary transition-colors">
          <ArrowLeft size={20} />
        </button>
        <SectionHeader title="필드 설정" level="page" />
      </div>

      {/* 도움말 배너 */}
      <HelpBanner
        label="필드 설정 안내 보기"
        onClick={() => setShowHelpDrawer(true)}
        className="mb-3"
      />

      {/* 도움말 드로어 */}
      <HelpDrawer
        open={showHelpDrawer}
        onClose={() => setShowHelpDrawer(false)}
        title="필드 설정 안내"
        sections={[
          {
            title: '필드란 무엇인가요?',
            content: '필드는 신청서와 관리 화면에 표시되는 각각의 입력 항목(상호명, 전화번호, 주소 등)을 말합니다.\n\n필드 설정에서 각 항목의 표시 이름을 바꾸거나 화면에서 숨길 수 있습니다.',
          },
          {
            title: '필드를 숨기거나 이름 변경하는 방법',
            content: '표시 이름 입력란을 직접 수정하면 이름을 바꿀 수 있습니다.\n\n오른쪽 "서비스관리" 토글을 끄면 관리 화면에서 해당 필드가 숨겨집니다.\n"폼" 토글을 끄면 고객 신청서에서도 숨겨집니다.',
          },
          {
            title: 'SMS 변수에 반영되는 이름 변경',
            content: '필드 이름을 변경하면 서비스 알림 문자(SMS)에서 해당 필드를 표시하는 변수 이름도 함께 바뀝니다.\n\nSMS 알림 설정 화면에서 변수 목록을 확인하면 변경된 이름으로 표시됩니다.',
          },
        ]}
      />

      {/* 도움말 팁 (warning) */}
      <HelpTip variant="warning" className="mb-3">
        필드 이름을 변경하면 SMS 알림 변수 목록에도 자동 반영됩니다.
      </HelpTip>

      <div className="flex items-center justify-end mb-1">
        <Button variant={editOrder ? 'primary' : 'secondary'} size="sm" onClick={() => setEditOrder(v => !v)}>
          <SlidersHorizontal size={14} />
          {editOrder ? '편집 완료' : '순서 편집'}
        </Button>
      </div>

      {editOrder ? (
        <DndContext sensors={outerSensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
          <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
            {sectionOrder.map(id => (
              <SortableSectionBlock key={id} sectionId={id} fieldKeys={fieldOrder[id] ?? []} {...commonSectionProps} />
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        sectionOrder.map(id => (
          <SectionBlock key={id} sectionId={id} fieldKeys={fieldOrder[id] ?? []} {...commonSectionProps} />
        ))
      )}

      {!editOrder && (
        <>
          {/* 결제 방법 */}
          <div className="pt-6 pb-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-600">결제 방법</p>
          </div>
          <div className="bg-surface rounded-2xl border-2 border-teal-200 px-3 shadow-flat">
            <ColumnHeader />
            <div className="flex items-start gap-2 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-text-tertiary mb-2">폼과 관리화면의 결제방법 드롭다운 항목에 동일하게 적용됩니다.</p>
                <PaymentOptionsEditor options={paymentOptions} onChange={setPaymentOptions} />
              </div>
              <div className="w-12 flex justify-center shrink-0 pt-1">
                <span className="text-[10px] font-medium text-brand-600 bg-brand-600/10 px-1.5 py-0.5 rounded-full">항상</span>
              </div>
              <div className="w-14 flex justify-center shrink-0 pt-1">
                <span className="text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">항상</span>
              </div>
            </div>
          </div>

          {/* 신청 페이지 안내 문구 */}
          <div className="pt-4 pb-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-600">신청 페이지 안내 문구</p>
          </div>
          <div className="bg-surface rounded-2xl border-2 border-violet-200 px-3 shadow-flat">
            <ColumnHeader />
            <div className="flex items-start gap-2 py-3">
              <div className="flex-1 min-w-0">
                <textarea
                  value={heroSubtitle}
                  rows={3}
                  onChange={e => setHeroSubtitle(e.target.value)}
                  className="block w-full rounded-md bg-surface border border-border text-sm text-text-primary px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
                />
              </div>
              <div className="w-12 flex justify-center shrink-0 pt-1">
                <span className="text-[10px] font-medium text-brand-600 bg-brand-600/10 px-1.5 py-0.5 rounded-full">항상</span>
              </div>
              <div className="w-14 flex justify-center shrink-0 pt-1">
                <span className="text-text-tertiary text-sm select-none">─</span>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {saveError && <p className="text-sm text-state-danger text-center">{saveError}</p>}
        {saveSuccess && <p className="text-sm text-state-success text-center">저장되었습니다.</p>}
        <Button fullWidth onClick={handleSave} isLoading={isSaving}>저장</Button>
      </div>
    </div>
  )
}
