'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, ChevronUp, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Input } from '@/components/ui/Input'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'
import { SHOW_FIELD_LABELS, WORKER_FIELD_LABELS } from '@/lib/settings-defaults'
import type { FormConfig } from '@/types'

export default function FormSettingsPage() {
  const router = useRouter()
  const [config, setConfig] = useState<FormConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [newOption, setNewOption] = useState('')
  const [showHelpDrawer, setShowHelpDrawer] = useState(false)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/admin/settings/form')
        const json = await res.json()
        if (json.success) setConfig(json.data as FormConfig)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleAddPaymentOption = () => {
    const trimmed = newOption.trim()
    if (!trimmed || !config) return
    if (config.payment_options.includes(trimmed)) {
      setNewOption('')
      return
    }
    setConfig({ ...config, payment_options: [...config.payment_options, trimmed] })
    setNewOption('')
  }

  const handleRemovePaymentOption = (index: number) => {
    if (!config) return
    const updated = config.payment_options.filter((_, i) => i !== index)
    setConfig({ ...config, payment_options: updated })
  }

  const handleMovePaymentOption = (index: number, direction: 'up' | 'down') => {
    if (!config) return
    const arr = [...config.payment_options]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= arr.length) return
    const temp = arr[index]
    arr[index] = arr[target]
    arr[target] = temp
    setConfig({ ...config, payment_options: arr })
  }

  const handleToggleShowField = (key: keyof FormConfig['show_fields']) => {
    if (!config) return
    setConfig({
      ...config,
      show_fields: {
        ...config.show_fields,
        [key]: !config.show_fields[key],
      },
    })
  }

  const handleToggleWorkerField = (field: string) => {
    if (!config) return
    const current = config.worker_notify_fields
    const updated = current.includes(field)
      ? current.filter((f) => f !== field)
      : [...current, field]
    setConfig({ ...config, worker_notify_fields: updated })
  }

  const handleSave = async () => {
    if (!config) return
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch('/api/admin/settings/form', {
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
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 -ml-1 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <SectionHeader title="신청서 폼 설정" level="page" />
      </div>

      {/* 도움말 배너 */}
      <HelpBanner
        label="폼 설정 안내 보기"
        onClick={() => setShowHelpDrawer(true)}
      />

      {/* 도움말 드로어 */}
      <HelpDrawer
        open={showHelpDrawer}
        onClose={() => setShowHelpDrawer(false)}
        title="폼 설정 안내"
        sections={[
          {
            title: '신청서 폼이란 무엇인가요?',
            content: '고객이 서비스를 신청할 때 작성하는 입력 화면입니다.\n이 설정에서 고객에게 보여줄 항목과 결제 방법 옵션을 직접 구성할 수 있습니다.',
          },
          {
            title: '고객 신청서 폼 커스텀 방법',
            content: '"표시 항목 설정" 섹션에서 각 항목의 토글을 끄면 고객의 신청서에서 해당 입력란이 숨겨집니다.\n\n"결제 방법" 섹션에서 고객이 선택할 수 있는 결제 방법 목록을 직접 추가하거나 삭제할 수 있습니다.',
          },
          {
            title: '필수 / 선택 항목 설정',
            content: '상호명, 전화번호, 주소, 청소 범위 등 기본 항목은 항상 표시됩니다.\n\n이메일, 사업자번호, 계좌번호 등 선택 항목은 토글로 표시 여부를 설정할 수 있습니다.',
          },
        ]}
      />

      {/* 도움말 팁 */}
      <HelpTip>
        폼 설정은 고객이 서비스를 신청할 때 보이는 입력 화면을 구성합니다.
      </HelpTip>

      {/* 섹션 1: 결제 방법 */}
      <Card padding="md">
        <SectionHeader title="결제 방법" className="mb-3" />
        <div className="flex flex-col gap-2 mb-3">
          {config.payment_options.map((opt, i) => (
            <div key={opt} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-text-primary bg-surface-sunken px-3 py-2 rounded-lg break-keep">
                {opt}
              </span>
              <button
                type="button"
                onClick={() => handleMovePaymentOption(i, 'up')}
                disabled={i === 0}
                className="p-1.5 text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-colors"
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleMovePaymentOption(i, 'down')}
                disabled={i === config.payment_options.length - 1}
                className="p-1.5 text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-colors"
              >
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleRemovePaymentOption(i)}
                className="p-1.5 text-state-danger hover:opacity-70 transition-opacity"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="새 결제 방법 입력"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddPaymentOption() }}
            />
          </div>
          <Button size="md" onClick={handleAddPaymentOption}>
            <Plus size={16} />
            추가
          </Button>
        </div>
      </Card>

      {/* 섹션 2: 표시 항목 설정 */}
      <Card padding="md">
        <SectionHeader title="표시 항목 설정" className="mb-1" />
        <p className="text-xs text-text-tertiary mb-3">OFF 항목은 신청서 폼에서 숨겨집니다.</p>
        <div className="flex flex-col divide-y divide-border-subtle">
          {(Object.keys(SHOW_FIELD_LABELS) as Array<keyof FormConfig['show_fields']>).map((key) => (
            <div key={key} className="flex items-center justify-between py-3">
              <span className="text-sm text-text-primary">{SHOW_FIELD_LABELS[key]}</span>
              <button
                type="button"
                onClick={() => handleToggleShowField(key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.show_fields[key] ? 'bg-brand-600' : 'bg-border'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    config.show_fields[key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* 섹션 3: 작업자 전달 필드 */}
      <Card padding="md">
        <SectionHeader title="작업자 전달 필드" className="mb-1" />
        <p className="text-xs text-text-tertiary mb-3">선택된 항목만 작업자 알림 SMS에 포함됩니다.</p>
        <div className="flex flex-col divide-y divide-border-subtle">
          {Object.entries(WORKER_FIELD_LABELS).map(([field, label]) => (
            <label key={field} className="flex items-center justify-between py-3 cursor-pointer">
              <span className="text-sm text-text-primary">{label}</span>
              <input
                type="checkbox"
                checked={config.worker_notify_fields.includes(field)}
                onChange={() => handleToggleWorkerField(field)}
                className="w-4 h-4 accent-brand-600"
              />
            </label>
          ))}
        </div>
      </Card>

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
