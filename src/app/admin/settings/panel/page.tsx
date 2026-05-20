'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, X, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Input } from '@/components/ui/Input'
import {
  DEFAULT_PANEL_FIELDS,
  PANEL_SECTIONS,
  SECTION_BORDER_COLOR,
  SECTION_TITLE_COLOR,
  type PanelFieldDef,
} from '@/lib/settings-defaults'
import type { PanelConfig, PanelFieldOverride } from '@/types'

// ─── 섹션별 필드 그룹 ────────────────────────────────────────
function groupBySection(fields: PanelFieldDef[]): Record<string, PanelFieldDef[]> {
  const result: Record<string, PanelFieldDef[]> = {}
  for (const f of fields) {
    if (!result[f.section]) result[f.section] = []
    if (!f.readOnly) result[f.section].push(f)
  }
  return result
}

// ─── 드롭다운 옵션 편집기 ─────────────────────────────────────
interface OptionsEditorProps {
  options: string[]
  onChange: (opts: string[]) => void
}

function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const [newOpt, setNewOpt] = useState('')

  function handleAdd() {
    const trimmed = newOpt.trim()
    if (!trimmed || options.includes(trimmed)) {
      setNewOpt('')
      return
    }
    onChange([...options, trimmed])
    setNewOpt('')
  }

  function handleRemove(idx: number) {
    onChange(options.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-sunken text-xs text-text-primary border border-border-subtle">
            {opt}
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="ml-0.5 text-text-tertiary hover:text-state-danger transition-colors"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {options.length === 0 && (
          <span className="text-xs text-text-tertiary">옵션 없음</span>
        )}
      </div>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={newOpt}
          placeholder="새 옵션 추가"
          onChange={(e) => setNewOpt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          className="flex-1 h-8 rounded-md bg-surface border border-border text-xs text-text-primary px-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="h-8 px-2 rounded-md bg-surface-sunken border border-border text-text-secondary hover:text-text-primary transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── 필드 행 편집기 ───────────────────────────────────────────
interface FieldEditorRowProps {
  field: PanelFieldDef
  override: PanelFieldOverride
  onChange: (key: string, override: PanelFieldOverride) => void
}

function FieldEditorRow({ field, override, onChange }: FieldEditorRowProps) {
  const currentLabel = override.label ?? field.label
  const currentPlaceholder = override.placeholder ?? field.placeholder
  const currentOptions = override.options ?? field.options ?? []

  function update(patch: Partial<PanelFieldOverride>) {
    onChange(field.key, { ...override, ...patch })
  }

  return (
    <div className="py-3 border-b border-border-subtle last:border-0 flex flex-col gap-2">
      {/* 필드 원래 key 표시 (참고용) */}
      <p className="text-xs text-text-tertiary font-mono">{field.key}</p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">제목</label>
          <input
            type="text"
            value={currentLabel}
            onChange={(e) => update({ label: e.target.value || undefined })}
            placeholder={field.label}
            className="w-full h-8 rounded-md bg-surface border border-border text-xs text-text-primary px-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
        {field.type !== 'dropdown' && (
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">예시 텍스트</label>
            <input
              type="text"
              value={currentPlaceholder}
              onChange={(e) => update({ placeholder: e.target.value })}
              placeholder={field.placeholder || '예시 텍스트'}
              className="w-full h-8 rounded-md bg-surface border border-border text-xs text-text-primary px-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>
        )}
      </div>

      {field.type === 'dropdown' && (
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">드롭다운 옵션</label>
          <OptionsEditor
            options={currentOptions}
            onChange={(opts) => update({ options: opts })}
          />
        </div>
      )}
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function PanelSettingsPage() {
  const router = useRouter()
  const [config, setConfig] = useState<PanelConfig>({ fields: {} })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fieldGroups = groupBySection(DEFAULT_PANEL_FIELDS)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/admin/settings/panel')
        const json = await res.json()
        if (json.success && json.data) {
          setConfig(json.data as PanelConfig)
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  function handleFieldChange(key: string, override: PanelFieldOverride) {
    setConfig((prev) => ({
      ...prev,
      fields: { ...prev.fields, [key]: override },
    }))
  }

  function handleReset() {
    if (!confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) return
    setConfig({ fields: {} })
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch('/api/admin/settings/panel', {
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
        <div className="h-40 rounded-2xl bg-surface-sunken animate-pulse" />
        <div className="h-40 rounded-2xl bg-surface-sunken animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-24">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 -ml-1 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <SectionHeader title="서비스 관리 화면 설정" level="page" />
      </div>

      {/* 기본값으로 초기화 */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleReset}>
          기본값으로 초기화
        </Button>
      </div>

      {/* 섹션별 필드 편집 */}
      {PANEL_SECTIONS.map((section) => {
        const fields = fieldGroups[section.id] ?? []
        if (fields.length === 0) return null
        const borderColor = SECTION_BORDER_COLOR[section.color] ?? 'border-gray-200'
        const titleColor = SECTION_TITLE_COLOR[section.color] ?? 'text-gray-500'

        return (
          <Card key={section.id} padding="md" className={`border-2 ${borderColor}`}>
            <p className={`text-sm font-bold mb-3 ${titleColor}`}>{section.title}</p>
            <div className="flex flex-col">
              {fields.map((field) => (
                <FieldEditorRow
                  key={field.key}
                  field={field}
                  override={config.fields[field.key] ?? {}}
                  onChange={handleFieldChange}
                />
              ))}
            </div>
          </Card>
        )
      })}

      {/* 저장 */}
      {saveError && (
        <p className="text-sm text-state-danger text-center">{saveError}</p>
      )}
      {saveSuccess && (
        <p className="text-sm text-state-success text-center">저장되었습니다.</p>
      )}
      <Button fullWidth onClick={handleSave} isLoading={isSaving}>
        저장
      </Button>
    </div>
  )
}
