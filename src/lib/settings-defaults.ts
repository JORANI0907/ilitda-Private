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
