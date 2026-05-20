// ─── 공통 역할 ───────────────────────────────────────────────
export type ActiveRole = 'business' | 'worker'

// ─── 사용자 프로필 ────────────────────────────────────────────
export interface Profile {
  id: string
  phone: string
  name: string
  active_role: ActiveRole
  is_business: boolean
  is_worker: boolean
  rating_avg: number
  rating_count: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ─── 사업자 프로필 ────────────────────────────────────────────
export interface Business {
  id: string
  profile_id: string
  business_name: string
  registration_number: string | null
  address: string | null
  representative_name: string | null
  request_slug: string | null
  created_at: string
  updated_at: string
}

// ─── 용역자 프로필 ────────────────────────────────────────────
export interface Worker {
  id: string
  profile_id: string
  birthdate: string | null
  account_bank: string | null
  account_number: string | null
  available_regions: string[]
  certifications: string[]
  experience: string | null
  created_at: string
  updated_at: string
}

// ─── 고객 (사업자가 관리) ─────────────────────────────────────
export interface Client {
  id: string
  business_id: string
  name: string
  phone: string | null
  address: string | null
  type: string | null
  service_type: string | null
  is_favorite: boolean
  notes: string | null
  // 현장 정보
  elevator: string | null
  building_access: string | null
  access_method: string | null
  parking: string | null
  door_password: string | null
  business_hours_start: string | null
  business_hours_end: string | null
  care_scope: string | null
  // 방문 일정
  visit_interval_days: number | null
  next_visit_date: string | null
  // 결제 정보
  unit_price: number | null
  billing_cycle: string | null
  payment_method: string | null
  deposit: number | null
  supply_amount: number | null
  vat: number | null
  balance: number | null
  // 계약 관리
  status: string | null          // 'active' | 'paused' | 'terminated'
  contract_start_date: string | null
  contract_end_date: string | null
  disposition: string | null     // '호의' | '보통' | '주의'
  admin_notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ─── 서비스 신청서 ────────────────────────────────────────────
export type ServiceType = '1회성케어' | '정기딥케어' | '정기엔드케어'
export type RequestStatus = 'pending' | 'accepted' | 'rejected'

export interface ServiceRequest {
  id: string
  business_id: string
  client_name: string
  client_phone: string
  client_address: string
  service_type: ServiceType
  desired_date: string | null
  desired_time: string | null
  notes: string | null
  status: RequestStatus
  rejected_reason: string | null
  converted_schedule_id: string | null
  converted_client_id: string | null
  // 현장 정보
  elevator: string | null
  building_access: string | null
  access_method: string | null
  parking: string | null
  care_scope: string | null
  business_hours_start: string | null
  business_hours_end: string | null
  // 담당자 정보
  owner_name: string | null
  email: string | null
  business_number: string | null
  created_at: string
  updated_at: string
}

// ─── 서비스 일정 ──────────────────────────────────────────────
export type ScheduleStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface Schedule {
  id: string
  business_id: string
  client_id: string
  service_date: string
  start_time: string
  end_time: string | null
  status: ScheduleStatus
  fee: number | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ─── 직원 연결 ────────────────────────────────────────────────
export type ConnectionStatus = 'pending' | 'accepted'

export interface Connection {
  id: string
  business_id: string
  worker_profile_id: string | null
  is_manual: boolean
  manual_name: string | null
  manual_phone: string | null
  display_name: string
  status: ConnectionStatus
  invite_token: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ─── 배정 ─────────────────────────────────────────────────────
export type AssignmentStatus = 'pending' | 'accepted' | 'rejected' | 'completed'

export interface Assignment {
  id: string
  schedule_id: string
  worker_id: string
  connection_id: string | null
  hourly_rate: number | null
  status: AssignmentStatus
  attended_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ─── 출퇴근 ───────────────────────────────────────────────────
export interface Attendance {
  id: string
  assignment_id: string
  worker_id: string
  checkin_at: string | null
  checkin_lat: number | null
  checkin_lng: number | null
  checkout_at: string | null
  checkout_lat: number | null
  checkout_lng: number | null
  total_minutes: number | null
  created_at: string
  updated_at: string
}

// ─── 급여 ─────────────────────────────────────────────────────
export type PayrollStatus = 'pending' | 'paid'

export interface Payroll {
  id: string
  worker_id: string
  business_id: string
  period_start: string
  period_end: string
  total_hours: number
  total_amount: number
  status: PayrollStatus
  paid_at: string | null
  paid_method: string | null
  created_at: string
  updated_at: string
}

// ─── API 응답 공통 포맷 ───────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}
