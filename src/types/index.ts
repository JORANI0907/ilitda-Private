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
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
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

// ─── 배정 ─────────────────────────────────────────────────────
export type AssignmentStatus = 'pending' | 'accepted' | 'rejected' | 'completed'

export interface Assignment {
  id: string
  schedule_id: string
  worker_id: string
  hourly_rate: number | null
  status: AssignmentStatus
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
