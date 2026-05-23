'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { PlanFeatureConfig } from '@/app/api/admin/plan-features/route'

type PlanKey = 'free' | 'basic' | 'pro' | 'max'

const PLAN_COLORS: Record<PlanKey, string> = {
  free:  'text-text-secondary',
  basic: 'text-blue-600',
  pro:   'text-violet-600',
  max:   'text-amber-600',
}

const PLAN_LABELS: Record<PlanKey, string> = {
  free:  'Free',
  basic: 'Basic',
  pro:   'Pro',
  max:   'Max',
}

const PLAN_KEYS: PlanKey[] = ['free', 'basic', 'pro', 'max']

const CATEGORY_LABELS: Record<string, string> = {
  sms:     'SMS 기능',
  feature: '앱 기능',
  hr:      'HR 기능',
}

type LocalConfig = PlanFeatureConfig & {
  _booleanValues: Record<PlanKey, boolean>
  _numericValues: Record<PlanKey, string>
}

function toLocalConfig(c: PlanFeatureConfig): LocalConfig {
  const booleanValues = {
    free:  c.free_enabled  ?? false,
    basic: c.basic_enabled ?? false,
    pro:   c.pro_enabled   ?? false,
    max:   c.max_enabled   ?? false,
  }

  const numericValues = {
    free:  c.free_limit  === null ? '' : String(c.free_limit),
    basic: c.basic_limit === null ? '' : String(c.basic_limit),
    pro:   c.pro_limit   === null ? '' : String(c.pro_limit),
    max:   c.max_limit   === null ? '' : String(c.max_limit),
  }

  return { ...c, _booleanValues: booleanValues, _numericValues: numericValues }
}

function BooleanRow({
  config,
  onChange,
}: {
  config: LocalConfig
  onChange: (key: string, plan: PlanKey, value: boolean) => void
}) {
  return (
    <tr className="border-t border-border-subtle">
      <td className="py-3 pr-4 text-sm text-text-primary whitespace-nowrap">{config.label}</td>
      {PLAN_KEYS.map((plan) => (
        <td key={plan} className="py-3 text-center">
          <input
            type="checkbox"
            className="w-5 h-5 rounded accent-brand-600 cursor-pointer"
            checked={config._booleanValues[plan]}
            onChange={(e) => onChange(config.feature_key, plan, e.target.checked)}
          />
        </td>
      ))}
    </tr>
  )
}

function NumericRow({
  config,
  onChange,
}: {
  config: LocalConfig
  onChange: (key: string, plan: PlanKey, value: string) => void
}) {
  return (
    <tr className="border-t border-border-subtle">
      <td className="py-3 pr-4 text-sm text-text-primary whitespace-nowrap">{config.label}</td>
      {PLAN_KEYS.map((plan) => (
        <td key={plan} className="py-3 text-center">
          <input
            type="number"
            min="0"
            placeholder="∞"
            className="w-16 text-center border border-border rounded-md p-1 text-sm bg-surface focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
            value={config._numericValues[plan]}
            onChange={(e) => onChange(config.feature_key, plan, e.target.value)}
          />
        </td>
      ))}
    </tr>
  )
}

export default function AdminPlansPage() {
  const router = useRouter()
  const [configs, setConfigs] = useState<LocalConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/plan-features')
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '불러오기 실패')
        return
      }
      setConfigs((json.data ?? []).map(toLocalConfig))
    } catch {
      setError('네트워크 오류')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleBooleanChange(featureKey: string, plan: PlanKey, value: boolean) {
    setConfigs(prev =>
      prev.map(c =>
        c.feature_key === featureKey
          ? { ...c, _booleanValues: { ...c._booleanValues, [plan]: value } }
          : c
      )
    )
  }

  function handleNumericChange(featureKey: string, plan: PlanKey, value: string) {
    setConfigs(prev =>
      prev.map(c =>
        c.feature_key === featureKey
          ? { ...c, _numericValues: { ...c._numericValues, [plan]: value } }
          : c
      )
    )
  }

  async function handleSave() {
    setIsSaving(true)
    setError(null)

    const updates = configs.map(c => {
      if (c.feature_type === 'boolean') {
        return {
          feature_key:   c.feature_key,
          free_enabled:  c._booleanValues.free,
          basic_enabled: c._booleanValues.basic,
          pro_enabled:   c._booleanValues.pro,
          max_enabled:   c._booleanValues.max,
        }
      }
      return {
        feature_key: c.feature_key,
        free_limit:  c._numericValues.free  === '' ? null : Number(c._numericValues.free),
        basic_limit: c._numericValues.basic === '' ? null : Number(c._numericValues.basic),
        pro_limit:   c._numericValues.pro   === '' ? null : Number(c._numericValues.pro),
        max_limit:   c._numericValues.max   === '' ? null : Number(c._numericValues.max),
      }
    })

    try {
      const res = await fetch('/api/admin/plan-features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: updates }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '저장 실패')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const booleanConfigs = configs.filter(c => c.feature_type === 'boolean')
  const numericConfigs = configs.filter(c => c.feature_type === 'numeric')

  const booleanByCategory: Record<string, LocalConfig[]> = {}
  for (const c of booleanConfigs) {
    if (!booleanByCategory[c.category]) booleanByCategory[c.category] = []
    booleanByCategory[c.category].push(c)
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-24">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-sunken text-text-secondary hover:bg-border transition-colors shrink-0"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <SectionHeader
            title="플랜 기능 관리"
            description="플랜별 기능을 수정하면 해당 플랜 사용자에게 즉시 적용됩니다."
            level="page"
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          isLoading={isSaving}
          disabled={isSaving || isLoading}
          onClick={handleSave}
          className="shrink-0"
        >
          {saved ? '저장됨 ✓' : '저장'}
        </Button>
      </div>

      {/* 에러 */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
          <p className="text-sm text-state-danger">{error}</p>
        </div>
      )}

      {/* 로딩 스켈레톤 */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          {[1, 2].map(i => (
            <Card key={i} padding="md">
              <div className="flex flex-col gap-3">
                <div className="h-5 w-28 bg-surface-sunken rounded animate-pulse" />
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-8 w-full bg-surface-sunken rounded animate-pulse" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Boolean 기능 섹션 */}
      {!isLoading && Object.entries(booleanByCategory).map(([category, items]) => (
        <Card key={category} padding="md">
          <h3 className="text-sm font-semibold text-text-secondary mb-4">
            {CATEGORY_LABELS[category] ?? category}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px]">
              <thead>
                <tr>
                  <th className="text-left text-xs text-text-tertiary font-medium pb-2 pr-4 w-40">기능</th>
                  {PLAN_KEYS.map(plan => (
                    <th key={plan} className={`text-xs font-semibold pb-2 text-center min-w-[60px] ${PLAN_COLORS[plan]}`}>
                      {PLAN_LABELS[plan]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(config => (
                  <BooleanRow
                    key={config.feature_key}
                    config={config}
                    onChange={handleBooleanChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {/* Numeric 기능 섹션 */}
      {!isLoading && numericConfigs.length > 0 && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-text-secondary mb-1">수치 한도</h3>
          <p className="text-xs text-text-tertiary mb-4">빈 칸은 무제한(∞)으로 처리됩니다.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px]">
              <thead>
                <tr>
                  <th className="text-left text-xs text-text-tertiary font-medium pb-2 pr-4 w-40">기능</th>
                  {PLAN_KEYS.map(plan => (
                    <th key={plan} className={`text-xs font-semibold pb-2 text-center min-w-[60px] ${PLAN_COLORS[plan]}`}>
                      {PLAN_LABELS[plan]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {numericConfigs.map(config => (
                  <NumericRow
                    key={config.feature_key}
                    config={config}
                    onChange={handleNumericChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
