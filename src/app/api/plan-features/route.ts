import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { PLAN_FEATURES } from '@/lib/plan-features'
import type { PlanType, PlanFeatureMap } from '@/lib/plan-features'

interface PlanFeatureConfigRow {
  feature_key: string
  label: string
  category: string
  feature_type: 'boolean' | 'numeric'
  free_enabled: boolean | null
  basic_enabled: boolean | null
  pro_enabled: boolean | null
  max_enabled: boolean | null
  free_limit: number | null
  basic_limit: number | null
  pro_limit: number | null
  max_limit: number | null
}

export interface FeatureMeta {
  feature_key: string
  label: string
  category: string
  feature_type: 'boolean' | 'numeric'
}

type DynamicFeatures = Record<PlanType, PlanFeatureMap>

interface PlanFeaturesResponse {
  features: DynamicFeatures
  meta: FeatureMeta[]
}

function buildDynamicFeatures(rows: PlanFeatureConfigRow[]): DynamicFeatures {
  const result: DynamicFeatures = {
    free:  { ...PLAN_FEATURES.free },
    basic: { ...PLAN_FEATURES.basic },
    pro:   { ...PLAN_FEATURES.pro },
    max:   { ...PLAN_FEATURES.max },
  }

  for (const row of rows) {
    const key = row.feature_key as keyof PlanFeatureMap

    if (row.feature_type === 'boolean') {
      result.free[key]  = (row.free_enabled  ?? PLAN_FEATURES.free[key])  as never
      result.basic[key] = (row.basic_enabled ?? PLAN_FEATURES.basic[key]) as never
      result.pro[key]   = (row.pro_enabled   ?? PLAN_FEATURES.pro[key])   as never
      result.max[key]   = (row.max_enabled   ?? PLAN_FEATURES.max[key])   as never
    } else {
      result.free[key]  = (row.free_limit  !== null ? row.free_limit  : Infinity) as never
      result.basic[key] = (row.basic_limit !== null ? row.basic_limit : Infinity) as never
      result.pro[key]   = (row.pro_limit   !== null ? row.pro_limit   : Infinity) as never
      result.max[key]   = (row.max_limit   !== null ? row.max_limit   : Infinity) as never
    }
  }

  return result
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .schema('ilitda')
      .from('plan_feature_configs')
      .select('feature_key, label, category, feature_type, free_enabled, basic_enabled, pro_enabled, max_enabled, free_limit, basic_limit, pro_limit, max_limit')
      .order('category')
      .order('feature_key')

    if (error) {
      return NextResponse.json({ success: true, data: { features: PLAN_FEATURES, meta: [] } })
    }

    const rows = (data ?? []) as PlanFeatureConfigRow[]
    const features = buildDynamicFeatures(rows)
    const meta: FeatureMeta[] = rows.map(r => ({
      feature_key:  r.feature_key,
      label:        r.label,
      category:     r.category,
      feature_type: r.feature_type,
    }))

    return NextResponse.json({ success: true, data: { features, meta } })
  } catch {
    return NextResponse.json({ success: true, data: { features: PLAN_FEATURES, meta: [] } })
  }
}
