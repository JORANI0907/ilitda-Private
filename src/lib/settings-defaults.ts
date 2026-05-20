import type { FormConfig, NotificationConfig } from '@/types'

export const NOTIFY_TYPES = [
  '예약확정알림', '예약1일전알림', '예약당일알림', '작업완료알림',
  '결제알림', '결제완료알림', '결제완료알림(잔금)', '계산서발행완료알림',
  '예약금 입금완료 알림', '예약금환급완료알림', '예약취소알림',
  'A/S방문알림', '방문견적알림',
] as const

export const DEFAULT_MSG_TEMPLATE: Record<string, (p: Record<string, string>) => string> = {
  '예약확정알림':         (p) => `[일잇다] ${p.name} 담당자님, 예약이 확정되었습니다.\n시공일: ${p.date} ${p.time}`,
  '예약1일전알림':        (p) => `[일잇다] ${p.name} 담당자님, 내일(${p.date}) 방문 예정입니다.\n시간: ${p.time}`,
  '예약당일알림':         (p) => `[일잇다] ${p.name} 담당자님, 오늘(${p.date}) 방문 예정입니다.`,
  '작업완료알림':         (p) => `[일잇다] ${p.name} 담당자님, 작업이 완료되었습니다. 감사합니다.`,
  '결제알림':             (p) => `[일잇다] ${p.name} 담당자님, 결제 안내 드립니다.\n금액: ${p.amount}원\n계좌: ${p.account}`,
  '결제완료알림':         (p) => `[일잇다] ${p.name} 담당자님, 결제가 확인되었습니다. 감사합니다.`,
  '결제완료알림(잔금)':   (p) => `[일잇다] ${p.name} 담당자님, 잔금 결제가 확인되었습니다. 감사합니다.`,
  '계산서발행완료알림':   (p) => `[일잇다] ${p.name} 담당자님, 세금계산서가 발행되었습니다.`,
  '예약금 입금완료 알림': (p) => `[일잇다] ${p.name} 담당자님, 예약금 입금이 확인되었습니다.`,
  '예약금환급완료알림':   (p) => `[일잇다] ${p.name} 담당자님, 예약금이 환급되었습니다.`,
  '예약취소알림':         (p) => `[일잇다] ${p.name} 담당자님, 예약이 취소되었습니다.`,
  'A/S방문알림':          (p) => `[일잇다] ${p.name} 담당자님, A/S 방문 일정을 안내 드립니다.\n방문일: ${p.date}`,
  '방문견적알림':         (p) => `[일잇다] ${p.name} 담당자님, 방문견적 일정을 안내 드립니다.\n방문일: ${p.date}`,
}

export const DEFAULT_FORM_CONFIG: FormConfig = {
  payment_options: ['현금(세금계산서)', '카드결제', '현금(비과세X)'],
  show_fields: {
    owner_name: true,
    email: true,
    business_number: true,
    account_number: true,
    elevator: true,
    parking: true,
    building_access: true,
    access_method: true,
  },
  worker_notify_fields: ['business_name', 'phone', 'address', 'construction_date', 'construction_time', 'care_scope'],
  hero_subtitle: '아래 정보를 입력하시면\n담당자가 빠르게 연락드리겠습니다.',
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  rules: NOTIFY_TYPES.map((type) => ({
    type,
    enabled: true,
    mode: 'manual' as const,
    trigger: undefined,
    template: null,
  })),
}

export const WORKER_FIELD_LABELS: Record<string, string> = {
  business_name: '업체명/이름',
  phone: '연락처',
  owner_name: '담당자명',
  address: '주소',
  construction_date: '시공일',
  construction_time: '시공시간',
  care_scope: '청소 범위',
  elevator: '엘리베이터',
  parking: '주차',
  access_method: '출입 방법',
  request_notes: '요청사항',
}

export const SHOW_FIELD_LABELS: Record<string, string> = {
  owner_name: '담당자명',
  email: '이메일',
  business_number: '사업자번호',
  account_number: '계좌번호',
  elevator: '엘리베이터',
  parking: '주차',
  building_access: '건물출입신청여부',
  access_method: '출입 방법 상세',
}

// ─── 패널 필드 정의 ───────────────────────────────────────────

export interface PanelFieldDef {
  key: string
  label: string
  placeholder: string
  type: 'text' | 'number' | 'date' | 'time' | 'dropdown' | 'textarea'
  options?: string[]
  section: string
  readOnly?: boolean
}

export const PANEL_SECTIONS = [
  { id: 'basic',    title: '기본 정보', color: 'blue'   },
  { id: 'site',     title: '현장 정보', color: 'green'  },
  { id: 'schedule', title: '일정',     color: 'violet' },
  { id: 'request',  title: '요청사항', color: 'amber'  },
  { id: 'payment',  title: '결제 정보', color: 'teal'   },
  { id: 'misc',     title: '기타',     color: 'gray'   },
] as const

export const DEFAULT_PANEL_FIELDS: PanelFieldDef[] = [
  // 기본 정보
  { key: 'business_name',    label: '업체명',     placeholder: '업체명',              type: 'text',     section: 'basic'    },
  { key: 'owner_name',       label: '담당자명',   placeholder: '홍길동',              type: 'text',     section: 'basic'    },
  { key: 'platform_nickname',label: '닉네임',     placeholder: '플랫폼 닉네임',       type: 'text',     section: 'basic'    },
  { key: 'phone',            label: '연락처',     placeholder: '010-0000-0000',       type: 'text',     section: 'basic'    },
  { key: 'email',            label: '이메일',     placeholder: 'example@email.com',   type: 'text',     section: 'basic'    },
  { key: 'business_number',  label: '사업자번호', placeholder: '000-00-00000',        type: 'text',     section: 'basic'    },
  { key: 'address',          label: '주소',       placeholder: '주소',                type: 'text',     section: 'basic'    },
  // 현장 정보
  { key: 'elevator',         label: '엘리베이터', placeholder: '선택',                type: 'dropdown', options: ['있음', '없음', '계단 전용'], section: 'site' },
  { key: 'parking',          label: '주차',       placeholder: '선택',                type: 'dropdown', options: ['가능', '불가', '유료 주차'],  section: 'site' },
  { key: 'building_access',  label: '건물출입',   placeholder: '선택',                type: 'dropdown', options: ['자유출입', '사전출입신청'],   section: 'site' },
  { key: 'access_method',    label: '출입방법',   placeholder: '예: 비밀번호 입력',   type: 'text',     section: 'site'    },
  { key: 'door_password',    label: '도어락',     placeholder: '예: 1234#',           type: 'text',     section: 'site'    },
  // 일정
  { key: 'construction_date',label: '시공일',     placeholder: '',                    type: 'date',     section: 'schedule' },
  { key: 'construction_time',label: '시공시간',   placeholder: '',                    type: 'time',     section: 'schedule' },
  // 요청사항
  { key: 'care_scope',          label: '청소 범위',   placeholder: '청소 범위 입력',          type: 'textarea', section: 'request'  },
  { key: 'request_notes',       label: '고객 요청',   placeholder: '고객 요청사항',           type: 'textarea', section: 'request'  },
  { key: 'admin_request_notes', label: '관리자 추가', placeholder: '관리자 추가 요청사항',    type: 'textarea', section: 'request'  },
  // 결제 정보
  { key: 'payment_method',  label: '결제방법', placeholder: '선택', type: 'dropdown', options: ['현금(세금계산서)', '카드결제', '현금(비과세X)'], section: 'payment' },
  { key: 'account_number',  label: '계좌번호', placeholder: '은행 + 계좌번호', type: 'text',   section: 'payment'  },
  { key: 'supply_amount',   label: '공급가액', placeholder: '0',               type: 'number', section: 'payment'  },
  { key: 'vat',             label: '부가세',   placeholder: '0',               type: 'number', section: 'payment'  },
  { key: 'supply_total',    label: '공급대가', placeholder: '',                type: 'number', section: 'payment', readOnly: true },
  { key: 'balance',         label: '잔금',     placeholder: '0',               type: 'number', section: 'payment'  },
  // 기타
  { key: 'disposition', label: '고객 성향',  placeholder: '선택',   type: 'dropdown', options: ['호의', '보통', '주의'], section: 'misc' },
  { key: 'admin_notes', label: '관리자 메모', placeholder: '내부 메모', type: 'textarea', section: 'misc'    },
]

export const SECTION_BORDER_COLOR: Record<string, string> = {
  blue:   'border-blue-200',
  green:  'border-green-200',
  violet: 'border-violet-200',
  amber:  'border-amber-200',
  teal:   'border-teal-200',
  gray:   'border-gray-200',
}

export const SECTION_TITLE_COLOR: Record<string, string> = {
  blue:   'text-blue-600',
  green:  'text-green-600',
  violet: 'text-violet-600',
  amber:  'text-amber-600',
  teal:   'text-teal-600',
  gray:   'text-gray-500',
}
