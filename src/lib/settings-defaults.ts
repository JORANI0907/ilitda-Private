import type { FormConfig, NotificationConfig } from '@/types'

export const NOTIFY_TYPES = [
  '예약확정알림', '예약1일전알림', '예약당일알림', '서비스완료알림',
  '결제알림', '결제완료알림', '결제완료알림(잔금)', '계산서발행완료알림',
  '예약금 입금완료 알림', '예약금환급완료알림', '예약취소알림',
  'A/S방문알림', '방문견적알림', '폴더링크알림',
] as const

export const DEFAULT_MSG_TEMPLATE: Record<string, (p: Record<string, string>) => string> = {
  '예약확정알림':
    (p) => `[일잇다] ${p.name} 담당자님, 예약이 확정되었습니다.\n\n서비스 일시: ${p.date} ${p.time}\n\n당일 방문 전 연락드리겠습니다.\n문의: ${p.contact}`,

  '예약1일전알림':
    (p) => `[일잇다] ${p.name} 담당자님,\n내일(${p.date}) 서비스 방문 예정입니다.\n\n방문 시간: ${p.time}\n\n문의 또는 변경 사항은 미리 연락 부탁드립니다.\n문의: ${p.contact}`,

  '예약당일알림':
    (p) => `[일잇다] ${p.name} 담당자님,\n오늘(${p.date}) 서비스 방문 예정입니다.\n\n방문 예정 시간: ${p.time}\n현장 준비 부탁드립니다.\n문의: ${p.contact}`,

  '서비스완료알림':
    (p) => `[일잇다] ${p.name} 담당자님,\n서비스가 완료되었습니다.\n\n이용해 주셔서 감사합니다.\n불편하신 점이 있으시면 언제든 연락해 주세요.\n문의: ${p.contact}`,

  '결제알림':
    (p) => `[일잇다] ${p.name} 담당자님,\n결제 안내 드립니다.\n\n청구 금액: ${p.amount}원\n입금 계좌: ${p.account}\n\n입금 확인 후 영수증 발송 예정입니다.\n문의: ${p.contact}`,

  '결제완료알림':
    (p) => `[일잇다] ${p.name} 담당자님,\n입금이 확인되었습니다. 감사합니다!\n\n이용해 주셔서 감사합니다.\n문의: ${p.contact}`,

  '결제완료알림(잔금)':
    (p) => `[일잇다] ${p.name} 담당자님,\n잔금 입금이 확인되었습니다. 감사합니다!\n\n이용해 주셔서 감사합니다.\n문의: ${p.contact}`,

  '계산서발행완료알림':
    (p) => `[일잇다] ${p.name} 담당자님,\n세금계산서가 발행되었습니다.\n\n이메일로 전송된 계산서를 확인해 주세요.\n문의: ${p.contact}`,

  '예약금 입금완료 알림':
    (p) => `[일잇다] ${p.name} 담당자님,\n예약금 입금이 확인되었습니다.\n\n예약이 정상 접수되었습니다.\n서비스 일정은 별도 안내 드리겠습니다.\n문의: ${p.contact}`,

  '예약금환급완료알림':
    (p) => `[일잇다] ${p.name} 담당자님,\n예약금 환급이 완료되었습니다.\n\n영업일 기준 3~5일 내 입금됩니다.\n문의: ${p.contact}`,

  '예약취소알림':
    (p) => `[일잇다] ${p.name} 담당자님,\n예약이 취소되었습니다.\n\n취소 관련 문의 사항은 아래로 연락해 주세요.\n문의: ${p.contact}`,

  'A/S방문알림':
    (p) => `[일잇다] ${p.name} 담당자님,\nA/S 방문 일정을 안내 드립니다.\n\n방문 예정일: ${p.date} ${p.time}\n\n문의: ${p.contact}`,

  '방문견적알림':
    (p) => `[일잇다] ${p.name} 담당자님,\n방문 견적 일정을 안내 드립니다.\n\n방문 예정일: ${p.date} ${p.time}\n\n현장 확인 후 정확한 견적을 제공해 드리겠습니다.\n문의: ${p.contact}`,

  '폴더링크알림':
    (p) => `[일잇다] ${p.name} 담당자님,\n서비스 작업 사진을 공유드립니다.\n\n작업 전/후 사진: ${p.folderUrl}\n\n문의: ${p.contact}`,
}

// 새 커스텀 알림 추가 시 자동으로 채워지는 기본 문구 ({fieldKey} 형식)
export const CUSTOM_NOTIFICATION_DEFAULT_TEMPLATE =
  `[일잇다] {business_name} 담당자님,\n안내 말씀 드립니다.\n\n서비스 일시: {construction_date} {construction_time}\n\n문의사항은 언제든 연락 부탁드립니다.`

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
  custom_form_fields: [],
}

// 알림 타입 → 자동 변경될 상태값 매핑
const NOTIFY_STATUS_MAP: Partial<Record<string, string>> = {
  '예약확정알림':         '예약확정',
  '예약1일전알림':        '예약1일전',
  '예약당일알림':         '예약당일',
  '서비스완료알림':       '서비스완료',
  '결제알림':             '결제',
  '결제완료알림':         '결제완료',
  '결제완료알림(잔금)':   '결제완료(잔금)',
  '계산서발행완료알림':   '계산서발행완료',
  '예약금 입금완료 알림': '예약금 입금',
  '예약금환급완료알림':   '예약금환급완료',
  '예약취소알림':         '예약취소',
  'A/S방문알림':          'A/S방문',
  '방문견적알림':         '방문견적',
  // '폴더링크알림': 상태 변경 없음 (링크 공유 전용)
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  rules: NOTIFY_TYPES.map((type) => ({
    type,
    enabled: true,
    mode: 'manual' as const,
    trigger: undefined,
    template: null,
    status_value: NOTIFY_STATUS_MAP[type],
  })),
}

export const WORKER_FIELD_LABELS: Record<string, string> = {
  business_name: '업체명/이름',
  phone: '연락처',
  owner_name: '담당자명',
  address: '주소',
  construction_date: '서비스일',
  construction_time: '서비스시간',
  care_scope: '서비스 내용',
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
  defaultHidden?: boolean
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
  { key: 'owner_name',       label: '담당자명',      placeholder: '홍길동',              type: 'text',     section: 'basic'    },
  { key: 'platform_nickname',label: '플랫폼 닉네임', placeholder: '예: 스벅판교점',    type: 'text',     section: 'basic'    },
  { key: 'phone',            label: '연락처',        placeholder: '010-0000-0000',      type: 'text',     section: 'basic'    },
  { key: 'email',            label: '이메일',     placeholder: 'example@email.com',   type: 'text',     section: 'basic'    },
  { key: 'business_number',  label: '사업자번호', placeholder: '000-00-00000',        type: 'text',     section: 'basic'    },
  { key: 'address',          label: '주소',       placeholder: '주소',                type: 'text',     section: 'basic'    },
  { key: 'spare_basic_1',    label: '커스텀 필드 1', placeholder: '',                type: 'text',     section: 'basic',   defaultHidden: true },
  { key: 'spare_basic_2',    label: '커스텀 필드 2', placeholder: '',                type: 'text',     section: 'basic',   defaultHidden: true },
  // 현장 정보
  { key: 'elevator',         label: '엘리베이터', placeholder: '선택',                type: 'dropdown', options: ['있음', '없음', '계단 전용'], section: 'site' },
  { key: 'parking',          label: '주차',       placeholder: '선택',                type: 'dropdown', options: ['가능', '불가', '유료 주차'],  section: 'site' },
  { key: 'building_access',  label: '건물출입',   placeholder: '선택',                type: 'dropdown', options: ['자유출입', '사전출입신청'],   section: 'site' },
  { key: 'access_method',    label: '출입방법',       placeholder: '예: 비밀번호 입력',   type: 'text',     section: 'site'    },
  { key: 'door_password',    label: '도어락 비밀번호', placeholder: '비밀번호 입력',   type: 'text',     section: 'site'    },
  { key: 'spare_site_1',     label: '커스텀 필드 1',  placeholder: '',                type: 'text',     section: 'site',    defaultHidden: true },
  { key: 'spare_site_2',     label: '커스텀 필드 2', placeholder: '',                type: 'text',     section: 'site',    defaultHidden: true },
  // 일정
  { key: 'construction_date',label: '서비스일',   placeholder: '',                    type: 'date',     section: 'schedule' },
  { key: 'construction_time',label: '서비스시간', placeholder: '',                    type: 'time',     section: 'schedule' },
  { key: 'spare_schedule_1', label: '커스텀 필드 1', placeholder: '',                type: 'text',     section: 'schedule', defaultHidden: true },
  { key: 'spare_schedule_2', label: '커스텀 필드 2', placeholder: '',                type: 'text',     section: 'schedule', defaultHidden: true },
  // 요청사항
  { key: 'care_scope',          label: '서비스 내용', placeholder: '서비스 내용 입력',        type: 'textarea', section: 'request'  },
  { key: 'request_notes',       label: '고객 요청',   placeholder: '고객 요청사항',           type: 'textarea', section: 'request'  },
  { key: 'admin_request_notes', label: '관리자 추가', placeholder: '관리자 추가 요청사항',    type: 'textarea', section: 'request'  },
  { key: 'spare_request_1',     label: '커스텀 필드 1', placeholder: '',                      type: 'text',     section: 'request', defaultHidden: true },
  { key: 'spare_request_2',     label: '커스텀 필드 2', placeholder: '',                      type: 'text',     section: 'request', defaultHidden: true },
  // 결제 정보
  { key: 'payment_method',  label: '결제방법', placeholder: '선택', type: 'dropdown', options: ['현금(세금계산서)', '카드결제', '현금(비과세X)'], section: 'payment', readOnly: true },
  { key: 'account_number',  label: '계좌번호', placeholder: '은행 + 계좌번호', type: 'text',   section: 'payment'  },
  { key: 'supply_amount',   label: '공급가액', placeholder: '0',               type: 'number', section: 'payment', readOnly: true },
  { key: 'vat',             label: '부가세',   placeholder: '0',               type: 'number', section: 'payment', readOnly: true },
  { key: 'supply_total',    label: '총액',     placeholder: '',                type: 'number', section: 'payment', readOnly: true },
  { key: 'balance',         label: '잔금',     placeholder: '0',               type: 'number', section: 'payment', readOnly: true },
  { key: 'spare_payment_1', label: '커스텀 필드 1', placeholder: '',           type: 'text',   section: 'payment', defaultHidden: true },
  { key: 'spare_payment_2', label: '커스텀 필드 2', placeholder: '',           type: 'text',   section: 'payment', defaultHidden: true },
  // 기타
  { key: 'disposition', label: '고객 성향',  placeholder: '선택',   type: 'dropdown', options: ['호의', '보통', '주의'], section: 'misc' },
  { key: 'admin_notes', label: '관리자 메모', placeholder: '내부 메모', type: 'textarea', section: 'misc'    },
  { key: 'spare_misc_1', label: '커스텀 필드 1', placeholder: '', type: 'text', section: 'misc', defaultHidden: true },
  { key: 'spare_misc_2', label: '커스텀 필드 2', placeholder: '', type: 'text', section: 'misc', defaultHidden: true },
]

// ─── SMS 변수 토큰 메타 (필드키 기반) ──────────────────────────
// token 형식: {fieldKey} — 라벨이 바뀌어도 토큰은 유지됨
export const SMS_TOKEN_META: Record<string, { preview: string }> = {
  business_name:     { preview: '스타벅스 판교점' },
  owner_name:        { preview: '홍길동' },
  phone:             { preview: '010-1234-5678' },
  email:             { preview: 'hello@example.com' },
  business_number:   { preview: '123-45-67890' },
  address:           { preview: '성남시 분당구' },
  construction_date: { preview: '2025-01-15' },
  construction_time: { preview: '09:00' },
  care_scope:        { preview: '주방 후드, 에어컨 2대' },
  request_notes:     { preview: '특이사항 없음' },
  payment_method:    { preview: '현금(세금계산서)' },
  account_number:    { preview: '국민은행 123-456' },
  supply_amount:     { preview: '500,000원' },
  vat:               { preview: '50,000원' },
  supply_total:      { preview: '550,000원' },
  balance:           { preview: '450,000원' },
  drive_folder_url:  { preview: 'https://drive.google.com/drive/folders/예시링크' },
}

// 금액 포맷이 필요한 숫자 필드
const NUMERIC_AMOUNT_KEYS = new Set(['supply_amount', 'vat', 'supply_total', 'balance'])

// 커스텀 알림 템플릿의 {fieldKey} 토큰을 실제 데이터로 치환.
// 필드 설정 페이지에서 추가된 커스텀 필드(spare_* 등)도 자동으로 처리됨.
export function applyNotificationTemplate(
  template: string,
  app: Record<string, unknown>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const val = app[key]
    if (val === null || val === undefined || val === '') return ''
    if (typeof val === 'number') {
      return NUMERIC_AMOUNT_KEYS.has(key)
        ? `${val.toLocaleString('ko-KR')}원`
        : val.toLocaleString('ko-KR')
    }
    return String(val)
  })
}

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
