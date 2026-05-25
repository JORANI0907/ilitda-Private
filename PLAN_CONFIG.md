# 일잇다 플랜 구성 설정

> 이 파일을 수정한 뒤 저장하면 코드에 반영합니다.
> 수정 가능한 항목: 플랜 이름(한글), 가격, 기능별 허용 여부, 한도값

---

## 플랜 종류 (고정 — 추가/삭제 불가)

| 플랜 키   | 현재 이름 |
| --------- | --------- |
| `free`  | 무료      |
| `basic` | 베이직    |
| `pro`   | 프로      |
| `max`   | 맥스      |

---

## 가격 (월 구독료, 원)

| 플랜      | 가격  |
| --------- | ----- |
| `free`  | 0     |
| `basic` | 9900  |
| `pro`   | 14900 |
| `max`   | 25000 |

---

## 기능 권한 및 한도

> `true` / `false` 또는 숫자로 표기
> `Infinity` = 무제한 (숫자 한도 없음)
> 현재 플랜 게이트가 **없는** 기능은 모든 플랜에서 사용 가능 (마지막 섹션 참고)

### 플랜별 제한 기능 (코드에 게이트 존재)

| 기능 키                 | 설명                            | free  | basic    | pro      | max      |
| ----------------------- | ------------------------------- | ----- | -------- | -------- | -------- |
| `sms_daily_limit`     | 하루 SMS 발송 한도 (건)         | 10    | 20       | 50       | 100      |
| `sms_auto_dispatch`   | SMS 자동 발송                   | false | true     | true     | true     |
| `sms_custom_template` | SMS 문구 직접 커스텀            | false | true     | true     | true     |
| `worker_limit`        | 등록 가능한 작업자 수           | 10    | Infinity | Infinity | Infinity |
| `inventory`           | 재고 관리 (소모품·장비 입출고) | true  | true     | true     | true     |
| `marketplace`         | 마켓플레이스 (오더 매칭)        | false | true     | true     | true     |
| `contracts`           | 계약서 관리 (전자 서명 포함)    | false | false    | false    | false    |
| `app_name_custom`     | 앱 표시 이름 커스텀             | false | true     | true     | true     |
|                         | 신청서 목록                     | 100   | 500      | Infinity | Infinity |
|                         | 신규 신청서 폼 작성             | true  | true     | true     | true     |
|                         | 작업자 관리 (목록)              | true  | true     | true     | true     |
|                         | 급여 관리                       | true  | true     | true     | true     |
|                         | 매출 관리                       | true  | true     | true     | true     |
|                         | 견적서 관리                     | true  | true     | true     | true     |
|                         |                                 |       |          |          |          |
|                         | 서비스 폼 설정                  | true  | true     | true     | true     |
|                         | 서비스 화면 구성                | true  | true     | true     | true     |

---

### 모든 플랜 공통 기능 (게이트 없음 — 수정 불필요)

| 기능 / 페이지        | 경로                                             | 설명                                    |
| -------------------- | ------------------------------------------------ | --------------------------------------- |
| 홈 대시보드          | `/business/home`                               | 일정·신청서 요약 카드                  |
| 신청서 목록          | `/business/applications`                       | 서비스 신청서 목록 및 상태 관리         |
| 신청서 작성          | `/business/applications/new`                   | 신규 신청서 폼 작성                     |
| 작업자 관리 (목록)   | `/business/hr/workers`                         | 작업자 조회 (추가 시 한도 체크만 있음)  |
| 작업자 상세          | `/business/hr/workers/[id]`                    | 작업자 정보 상세·수정                  |
| 근태 관리            | `/business/hr/attendance`                      | 작업자 출퇴근 기록 조회                 |
| 급여 관리            | `/business/hr/payroll`                         | 작업자 급여 계산 및 엑셀 다운로드       |
| 매출 관리            | `/business/hr/revenue`                         | 월간·연간 매출 통계                    |
| 견적서 관리          | `/business/hr/quotations`                      | 견적서 작성·발송·관리                 |
| 프로필               | `/business/profile`                            | 사업체 정보, 가입 정보, SMS 발송량 현황 |
| 앱 알림 설정         | `/business/profile/settings/app-notifications` | 앱 내 활동 알림 수신 on/off             |
| SMS 알림 설정        | `/business/profile/settings/notifications`     | SMS 발송 규칙·자동발송·문구 커스텀    |
| 발신번호·Drive 연동 | `/business/profile/settings/integrations`      | Solapi 발신번호, Google Drive 연동      |
| 서비스 화면 구성     | `/business/profile/settings/fields`            | 신청서 폼에 노출할 필드 선택·순서      |
| 서비스 폼 설정       | `/business/profile/settings/form`              | 신청서 폼 고객 입력 항목 커스텀         |
| 플랜 구독            | `/business/settings/plan`                      | 현재 플랜 확인 및 업그레이드 신청       |

---

## 참고: 수정 후 반영되는 파일

- `src/lib/plan-features.ts` — PLAN_NAMES, PLAN_PRICES, PLAN_FEATURES
- `src/types/index.ts` — PLAN_SMS_LIMITS (sms_daily_limit 값과 동기화)
