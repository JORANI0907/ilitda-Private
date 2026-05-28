export type PlanType = 'free' | 'basic' | 'pro' | 'max'

export const PLAN_NAMES: Record<PlanType, string> = {
  free:  '무료',
  basic: '베이직',
  pro:   '프로',
  max:   '맥스',
}

export const PLAN_PRICES: Record<PlanType, number> = {
  free:  0,
  basic: 9900,
  pro:   14900,
  max:   25000,
}

// 플랜 순서 (낮은 → 높은)
const PLAN_ORDER: PlanType[] = ['free', 'basic', 'pro', 'max']

// ─── 기능별 플랜 접근 권한 ────────────────────────────────────────
export interface PlanFeatureMap {
  sms_daily_limit:     number
  sms_auto_dispatch:   boolean
  sms_custom_template: boolean
  worker_limit:        number
  inventory:           boolean
  marketplace:         boolean
  contracts:           boolean
  app_name_custom:     boolean
  application_limit:   number
  payroll:             boolean
  quotations:          boolean
  revenue:             boolean
  fields_settings:     boolean
  public_form:         boolean
  workers:             boolean
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatureMap> = {
  free: {
    sms_daily_limit:     300,
    sms_auto_dispatch:   false,
    sms_custom_template: false,
    worker_limit:        10,
    inventory:           true,
    marketplace:         false,
    contracts:           false,
    app_name_custom:     false,
    application_limit:   50,
    payroll:             false,
    quotations:          false,
    revenue:             false,
    fields_settings:     false,
    public_form:         false,
    workers:             false,
  },
  basic: {
    sms_daily_limit:     600,
    sms_auto_dispatch:   true,
    sms_custom_template: true,
    worker_limit:        Infinity,
    inventory:           true,
    marketplace:         true,
    contracts:           false,
    app_name_custom:     true,
    application_limit:   500,
    payroll:             true,
    quotations:          false,
    revenue:             true,
    fields_settings:     true,
    public_form:         true,
    workers:             true,
  },
  pro: {
    sms_daily_limit:     1500,
    sms_auto_dispatch:   true,
    sms_custom_template: true,
    worker_limit:        Infinity,
    inventory:           true,
    marketplace:         true,
    contracts:           false,
    app_name_custom:     true,
    application_limit:   Infinity,
    payroll:             true,
    quotations:          true,
    revenue:             true,
    fields_settings:     true,
    public_form:         true,
    workers:             true,
  },
  max: {
    sms_daily_limit:     3000,
    sms_auto_dispatch:   true,
    sms_custom_template: true,
    worker_limit:        Infinity,
    inventory:           true,
    marketplace:         true,
    contracts:           false,
    app_name_custom:     true,
    application_limit:   Infinity,
    payroll:             true,
    quotations:          true,
    revenue:             true,
    fields_settings:     true,
    public_form:         true,
    workers:             true,
  },
}

type BooleanFeatureKey = {
  [K in keyof PlanFeatureMap]: PlanFeatureMap[K] extends boolean ? K : never
}[keyof PlanFeatureMap]

type NumericFeatureKey = {
  [K in keyof PlanFeatureMap]: PlanFeatureMap[K] extends number ? K : never
}[keyof PlanFeatureMap]

/**
 * 현재 플랜이 해당 boolean 기능을 사용할 수 있는지 반환.
 * dynamicFeatures를 전달하면 DB에서 가져온 동적 설정을 사용하고,
 * 생략하면 하드코딩된 PLAN_FEATURES를 fallback으로 사용.
 */
export function canUseFeature(
  plan: PlanType,
  feature: BooleanFeatureKey,
  dynamicFeatures?: Record<PlanType, PlanFeatureMap>,
): boolean {
  const featureMap = dynamicFeatures ?? PLAN_FEATURES
  return (featureMap[plan]?.[feature] as boolean) ?? false
}

/**
 * 현재 플랜의 숫자형 한도 반환.
 * dynamicFeatures를 전달하면 DB에서 가져온 동적 설정을 사용하고,
 * 생략하면 하드코딩된 PLAN_FEATURES를 fallback으로 사용.
 */
export function getFeatureLimit(
  plan: PlanType,
  feature: NumericFeatureKey,
  dynamicFeatures?: Record<PlanType, PlanFeatureMap>,
): number {
  const featureMap = dynamicFeatures ?? PLAN_FEATURES
  const val = featureMap[plan]?.[feature] as number | null | undefined
  if (val === null) return Infinity  // JSON 직렬화 시 Infinity→null 손실 복원
  return val ?? 0
}

/**
 * 특정 기능을 사용하기 위해 필요한 최소 플랜 반환
 * boolean 기능: true인 가장 낮은 플랜
 * numeric 기능: 해당 값 이상인 가장 낮은 플랜
 */
export function getRequiredPlan(feature: keyof PlanFeatureMap): PlanType {
  for (const plan of PLAN_ORDER) {
    const val = PLAN_FEATURES[plan][feature]
    if (typeof val === 'boolean' && val) return plan
    if (typeof val === 'number' && val > 0) return plan
  }
  return 'max'
}

/**
 * 현재 플랜의 다음 단계 반환 (max이면 null)
 */
export function getUpgradePlan(plan: PlanType): PlanType | null {
  const idx = PLAN_ORDER.indexOf(plan)
  if (idx === -1 || idx === PLAN_ORDER.length - 1) return null
  return PLAN_ORDER[idx + 1]
}

/**
 * 문자열을 PlanType으로 안전하게 변환 (잘못된 값이면 'free' 반환)
 */
export function toPlanType(value: string | null | undefined): PlanType {
  if (value === 'basic' || value === 'pro' || value === 'max') return value
  return 'free'
}
