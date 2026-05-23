# 일잇다 (ilitda) 프로젝트 레퍼런스

> **이 파일을 먼저 읽어라.** 작업 전 반드시 전체 내용을 숙지할 것.
> 마지막 업데이트: 2026-05-23

---

## ⚠️ 절대 깨지면 안 되는 규칙

### 1. proxy.ts — 미들웨어 파일
- **이 앱의 미들웨어는 `src/proxy.ts`이다. `src/middleware.ts`가 아니다.**
- `middleware.ts`를 생성하면 "Both middleware file and proxy file detected" 빌드 오류 발생.
- `proxy.ts`는 세션 쿠키 갱신만 수행하며 리다이렉트 로직이 없다 (제거됨).
- 라우트 보호는 페이지 레벨에서 처리.

### 2. 플랜 게이트 + 게스트 bypass
- 모든 플랜 게이트는 반드시 `!isGuest` 조건을 포함해야 한다.
- 게스트가 데모 콘텐츠를 볼 수 있어야 하기 때문.
- **올바른 패턴:**
  ```tsx
  const isGuest = !auth?.isLoading && !auth?.user
  if (!planLoading && !isGuest && !canUseFeature(planType, 'feature')) {
    return <UpgradeModal ... />
  }
  ```
- `isGuest` 조건 없이 플랜 게이트만 넣으면 게스트가 업그레이드 모달에 막힌다.

### 3. isDemo 패턴
- 비로그인(게스트) 상태에서 API는 더미 데이터와 `isDemo: true`를 반환한다.
- 페이지는 `isDemo === true`일 때 데모 배너를 표시한다.
- 신규 API 작성 시 반드시 인증되지 않은 요청에 `isDemo: true` + 더미 데이터 반환 처리 추가.

### 4. 루트 리다이렉트
- `/` → `/business/home` 으로 리다이렉트 (게스트 포함 홈 화면 진입)

---

## 앱 개요

| 항목 | 내용 |
|------|------|
| 앱 이름 | 일잇다 (ilitda) |
| 프로덕션 URL | https://ilitda.vercel.app |
| 스택 | Next.js (커스텀 버전) + TypeScript + Tailwind CSS + Supabase |
| DB 스키마 | Supabase `ilitda` (public 아님!) |
| 인증 | Supabase Auth (OTP 기반) |
| SMS | Solapi API |
| 파일 저장 | Google Drive (서비스 계정) |

---

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx                    # / → /business/home 리다이렉트
│   ├── api/                        # API 라우트
│   ├── business/                   # 사업자 포털
│   ├── worker/                     # (용역자 포털)
│   ├── admin/                      # (관리자)
│   ├── login/                      # 로그인/회원가입
│   ├── request/[slug]/             # 공개 신청서 폼
│   ├── connect/[token]/            # 직원 초대 수락
│   └── contract-sign/[token]/      # 계약서 서명
├── proxy.ts                        # ← 미들웨어 (middleware.ts 아님!)
├── components/
│   ├── ui/                         # 공통 UI 컴포넌트
│   └── shared/                     # 공유 컴포넌트
├── contexts/
│   └── AuthContext.tsx             # 인증 상태 전역 컨텍스트
├── hooks/
│   ├── usePlanType.ts              # 현재 플랜 타입 훅
│   └── ...
├── lib/
│   ├── plan-features.ts            # 플랜별 기능 정의
│   ├── settings-defaults.ts        # 패널/SMS 설정 기본값
│   └── supabase/                   # Supabase 클라이언트
└── types/
    └── index.ts                    # 전체 타입 정의
```

---

## 페이지 구조 (business 포털)

| 경로 | 파일 | 설명 |
|------|------|------|
| `/business/home` | `home/page.tsx` | 홈 대시보드 |
| `/business/applications` | `applications/page.tsx` | 서비스 신청서 목록 |
| `/business/applications/new` | `applications/new/page.tsx` | 신규 신청서 작성 |
| `/business/ops/requests` | `ops/requests/page.tsx` | 운영 요청 관리 |
| `/business/hr` | `hr/page.tsx` | HR 탭 메인 |
| `/business/hr/workers` | `hr/workers/page.tsx` | 작업자 관리 (한도 게이트) |
| `/business/hr/workers/[id]` | `hr/workers/[id]/page.tsx` | 작업자 상세 |
| `/business/hr/attendance` | `hr/attendance/page.tsx` | 근태 관리 |
| `/business/hr/payroll` | `hr/payroll/page.tsx` | 급여 관리 |
| `/business/hr/revenue` | `hr/revenue/page.tsx` | 매출 관리 |
| `/business/hr/quotations` | `hr/quotations/page.tsx` | 견적서 관리 |
| `/business/hr/inventory` | `hr/inventory/page.tsx` | 재고 관리 (**pro+ 게이트**) |
| `/business/hr/contracts` | `hr/contracts/page.tsx` | 계약서 관리 (**max 게이트**) |
| `/business/hr/contracts/[id]` | `hr/contracts/[id]/page.tsx` | 계약서 상세 |
| `/business/hr/contracts/templates` | `hr/contracts/templates/page.tsx` | 계약서 템플릿 |
| `/business/market` | `market/page.tsx` | 마켓플레이스 (**pro+ 게이트**) |
| `/business/profile` | `profile/page.tsx` | 프로필 + 앱 이름 설정 |
| `/business/profile/settings/app-notifications` | `settings/app-notifications/page.tsx` | 앱 알림 설정 |
| `/business/profile/settings/notifications` | `settings/notifications/page.tsx` | SMS 알림 설정 (자동발송/커스텀 게이트) |
| `/business/profile/settings/integrations` | `settings/integrations/page.tsx` | Solapi + Drive 연동 |
| `/business/profile/settings/panel` | `settings/panel/page.tsx` | 서비스 관리 화면 설정 |
| `/business/profile/settings/fields` | `settings/fields/page.tsx` | 필드 설정 |
| `/business/profile/settings/form` | `settings/form/page.tsx` | 신청서 폼 설정 |
| `/business/settings/plan` | `settings/plan/page.tsx` | 플랜 구독 페이지 |

---

## API 라우트 전체 목록

### 인증
| 메서드 + 경로 | 설명 |
|---|---|
| POST `/api/auth/login` | 이메일/비밀번호 로그인 |
| POST `/api/auth/register` | 회원가입 |
| POST `/api/auth/logout` | 로그아웃 |
| POST `/api/auth/send-otp` | OTP SMS 발송 |
| POST `/api/auth/verify-otp` | OTP 검증 + 세션 생성 |
| GET/PATCH `/api/auth/profile` | 프로필 조회/수정 (플랜 정보 포함) |
| POST `/api/auth/switch-role` | 역할 전환 (business ↔ worker) |
| GET `/api/auth/check-username` | 사용자명 중복 확인 |

### 프로필
| 메서드 + 경로 | 설명 |
|---|---|
| GET/PATCH `/api/profile` | 전체 프로필 조회/수정 (app_display_name 포함) |

### 비즈니스 - 핵심
| 메서드 + 경로 | 설명 |
|---|---|
| GET `/api/business/home` | 홈 대시보드 데이터 |
| GET/POST `/api/business/requests` | 서비스 신청서 목록/생성 |
| GET/PATCH/DELETE `/api/business/requests/[id]` | 신청서 상세 |
| GET/POST `/api/business/schedules` | 일정 목록/생성 |
| PATCH `/api/business/schedules/[id]` | 일정 수정 |
| GET/POST `/api/business/customers` | 고객 목록/생성 |
| GET/PATCH/DELETE `/api/business/customers/[id]` | 고객 상세 |

### 비즈니스 - HR
| 메서드 + 경로 | 설명 |
|---|---|
| GET/POST `/api/business/hr/connections` | 작업자 목록/추가 |
| GET/PATCH/DELETE `/api/business/hr/connections/[id]` | 작업자 상세 |
| GET `/api/business/hr/payroll` | 급여 목록 |
| GET `/api/business/revenue` | 매출 데이터 |
| GET `/api/business/attendance` | 근태 데이터 |
| GET/POST `/api/business/assignments` | 배정 목록/생성 |
| PATCH `/api/business/assignments/[id]` | 배정 수정 |
| POST `/api/business/hr/applications/[id]/workers` | 신청서에 작업자 배정 |
| POST `/api/business/hr/requests/[id]/workers` | 요청에 작업자 배정 |

### 비즈니스 - 재고 (pro+ 필요)
| 메서드 + 경로 | 설명 |
|---|---|
| GET/POST `/api/business/inventory` | 재고 목록/생성 |
| GET/PATCH/DELETE `/api/business/inventory/[id]` | 재고 아이템 상세 |
| GET `/api/business/inventory/[id]/transactions` | 거래 내역 |
| POST `/api/business/inventory-transaction` | 입출고 기록 |
| GET/POST `/api/business/inventory-categories` | 재고 카테고리 |
| PATCH/DELETE `/api/business/inventory-categories/[id]` | 카테고리 수정/삭제 |

### 비즈니스 - 기타
| 메서드 + 경로 | 설명 |
|---|---|
| GET/POST `/api/business/plan` | 플랜 조회/신청 |
| GET/POST `/api/business/payroll` | 급여 계산 |
| GET `/api/business/revenue/export` | 매출 CSV 내보내기 |
| GET `/api/business/workers` | 작업자 목록 (간략) |

### 관리자 (admin)
| 메서드 + 경로 | 설명 |
|---|---|
| GET/POST `/api/admin/applications` | 신청서 전체 목록/생성 |
| GET/PATCH/DELETE `/api/admin/applications/[id]` | 신청서 상세 |
| POST `/api/admin/applications/[id]/notify` | SMS 알림 발송 |
| POST `/api/admin/applications/[id]/drive` | Drive 폴더 생성 |
| GET/POST `/api/admin/quotes` | 견적서 목록/생성 |
| GET/PATCH `/api/admin/quotes/[id]` | 견적서 상세 |
| POST `/api/admin/quotes/[id]/send` | 견적서 발송 |
| GET/POST `/api/admin/contract-templates` | 계약서 템플릿 |
| GET/PATCH/DELETE `/api/admin/contract-templates/[id]` | 템플릿 상세 |
| POST `/api/admin/contract-templates/upload` | 템플릿 파일 업로드 |
| GET/POST `/api/admin/contracts` | 계약서 목록/생성 |
| GET/PATCH `/api/admin/contracts/[id]` | 계약서 상세 |
| POST `/api/admin/contracts/[id]/send-otp` | 서명 OTP 발송 |
| POST `/api/admin/contracts/[id]/void` | 계약서 무효화 |
| GET/PATCH `/api/admin/settings/notifications` | SMS 알림 설정 |
| GET/PATCH `/api/admin/settings/panel` | 패널 설정 |
| GET/PATCH `/api/admin/settings/form` | 신청서 폼 설정 |
| GET `/api/admin/settings/fields` | 필드 설정 조회 |
| GET/PATCH `/api/admin/quote-settings` | 견적서 설정 |
| POST `/api/admin/quote-settings/seal` | 직인 이미지 업로드 |
| POST `/api/admin/integrations/solapi` | Solapi OTP 요청 |
| PUT `/api/admin/integrations/solapi` | Solapi OTP 검증 |
| DELETE `/api/admin/integrations/solapi` | Solapi 연동 해제 |
| PATCH `/api/admin/integrations/drive` | Google Drive 연동 |
| DELETE `/api/admin/integrations/drive` | Drive 연동 해제 |
| GET `/api/admin/accounts` | 전체 계정 목록 |
| GET/PATCH `/api/admin/accounts/[id]` | 계정 상세/수정 |
| GET/POST `/api/admin/payments` | 입금 내역 |
| POST `/api/admin/notifications/auto-dispatch` | SMS 자동 발송 트리거 |

### 공개 API (인증 불필요)
| 메서드 + 경로 | 설명 |
|---|---|
| GET/POST `/api/request/[slug]` | 공개 신청서 폼 제출 |
| GET/POST `/api/connect/[token]` | 직원 초대 수락 |
| GET/POST `/api/contract-sign/[token]` | 계약서 서명 |

---

## 플랜 시스템

### 플랜 정의 (`src/lib/plan-features.ts`)

```typescript
PLAN_FEATURES:
  free:  { sms_daily_limit: 10,  sms_auto_dispatch: false, sms_custom_template: false,
           worker_limit: 3,  inventory: false, marketplace: false, contracts: false, app_name_custom: false }
  basic: { sms_daily_limit: 50,  sms_auto_dispatch: false, sms_custom_template: false,
           worker_limit: 10, inventory: false, marketplace: false, contracts: false, app_name_custom: false }
  pro:   { sms_daily_limit: ∞,   sms_auto_dispatch: true,  sms_custom_template: true,
           worker_limit: ∞,  inventory: true,  marketplace: true,  contracts: false, app_name_custom: false }
  max:   { sms_daily_limit: ∞,   sms_auto_dispatch: true,  sms_custom_template: true,
           worker_limit: ∞,  inventory: true,  marketplace: true,  contracts: true,  app_name_custom: true  }
```

### 플랜 가격
| 플랜 | 월 가격 |
|------|---------|
| free | 0원 |
| basic | 9,900원 |
| pro | 14,900원 |
| max | 25,000원 |

### 현재 적용된 플랜 게이트

| 기능 | 파일 | 필요 플랜 | 게이트 방식 |
|------|------|-----------|-------------|
| 재고 관리 | `hr/inventory/page.tsx` | pro+ | 페이지 진입 시 모달 |
| 마켓플레이스 | `market/page.tsx` | pro+ | 페이지 진입 시 모달 |
| 계약서 관리 | `hr/contracts/page.tsx` | max | 페이지 진입 시 모달 |
| SMS 자동 발송 | `settings/notifications/page.tsx` | pro+ | 버튼 클릭 시 모달 |
| SMS 커스텀 문구 | `settings/notifications/page.tsx` | pro+ | 체크박스 클릭 시 모달 |
| 직원 수 한도 | `hr/workers/page.tsx` | free:3명 / basic:10명 | 추가 버튼 클릭 시 모달 |
| 앱 이름 커스텀 | `profile/page.tsx` | max | 저장 버튼 클릭 시 모달 |

### 게이트 구현 패턴
```tsx
// 페이지 레벨 게이트 (inventory, contracts, marketplace)
const { planType, isLoading: planLoading } = usePlanType()
const auth = useContext(AuthContext)
const isGuest = !auth?.isLoading && !auth?.user

if (!planLoading && !isGuest && !canUseFeature(planType, 'feature_name')) {
  return (
    <div>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)}
        featureName="기능명" requiredPlan="pro" currentPlan={planType} />
    </div>
  )
}

// 액션 레벨 게이트 (버튼 클릭, 저장 등)
function handleAction() {
  if (!canUseFeature(planType, 'feature_name')) {
    setUpgradeOpen(true)
    return
  }
  // 실제 동작
}
```

### 결제 정책 (무통장 입금)

> 관리자 참조 페이지: `/admin/policy`

| 신청 유형 | 조건 | 만료일 계산 | 관리자 처리 |
|-----------|------|------------|------------|
| 업그레이드 | 신청 플랜 > 현재 플랜 | 확인일 + 30일 (기존 기간 소멸) | 즉시 처리 |
| 갱신 | 신청 플랜 = 현재 플랜 | 현재 만료일 + 30일 (만료 시 확인일 + 30일) | 즉시 처리 |
| 하향 | 신청 플랜 < 현재 플랜 | 확인일 + 30일 | **현재 만료일 이후 처리** |

- `payments.request_type`: `'upgrade' | 'renewal' | 'downgrade'`
- `payments.current_plan`: 신청 시점의 현재 플랜 (히스토리 추적용)
- 결제 수단: 무통장 입금 전용 (자동이체 없음)
- 관련 파일: `api/business/plan/route.ts`, `api/admin/payments/route.ts`, `admin/payments/page.tsx`, `business/settings/plan/page.tsx`

---

## 인증 & 세션

### AuthContext
- `src/contexts/AuthContext.tsx`에서 전역 인증 상태 관리
- 제공 값: `user`, `isLoading`
- 게스트 감지: `const isGuest = !auth?.isLoading && !auth?.user`

### usePlanType 훅
- `src/hooks/usePlanType.ts`
- `/api/auth/profile` 호출 → `business.plan_type` 추출
- 반환: `{ planType: PlanType, isLoading: boolean }`
- 오류/비로그인 시 기본값 `'free'` 반환

### API 응답 공통 포맷
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  isDemo?: boolean  // 게스트 더미 데이터 시 true
  meta?: { total: number; page: number; limit: number }
}
```

### Supabase 클라이언트
- 서버: `createServiceClient()` — RLS 우회, API route에서 사용
- 클라이언트: `createClient()` — 브라우저 컴포넌트에서 사용
- **DB 스키마: `ilitda` (public이 아님)**

---

## 핵심 타입 (`src/types/index.ts`)

### Business
```typescript
{
  id, profile_id, business_name, registration_number, address,
  representative_name, request_slug,
  form_config: FormConfig,
  notification_config: NotificationConfig,
  panel_config: PanelConfig,
  solapi_from_phone, solapi_phone_verified,
  gmail_for_drive, drive_root_folder_id,
  plan_type, plan, plan_expires_at,
  daily_sms_count, daily_sms_reset_date,
  app_display_name
}
```

### ServiceApplication (ApplicationStatus)
```
'신규' | '견적발송' | '예약확정' | '예약1일전' | '예약당일' | '서비스완료'
| '결제' | '결제완료' | '결제완료(잔금)' | '계산서발행완료' | '비과세'
| '카드결제 완료' | '예약금환급완료' | '예약금 입금' | '예약취소'
| 'A/S방문' | '방문견적'
```

### ServiceType
```
'1회성케어' | '정기딥케어' | '정기엔드케어'
```
> ❌ "정기케어" 사용 절대 금지 (전역 규칙)

### Connection (직원 연결)
```typescript
{
  id, business_id, worker_profile_id,
  is_manual,          // true = 수동 등록, false = 앱 초대
  manual_name, manual_phone, manual_account_bank, manual_account_number,
  display_name,       // 화면에 표시되는 이름
  status: 'pending' | 'accepted',
  invite_token,
  profiles?: { name, phone }  // 앱 연결된 경우 조인
}
```

---

## 외부 연동

### Solapi (SMS)
- 용도: OTP 발송 + 서비스 알림 SMS
- 인증: HMAC-SHA256
- 주요 엔드포인트: `POST /api/admin/integrations/solapi` (OTP 요청), `PUT` (검증)
- 환경변수: `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_FROM_PHONE`
- 일일 한도: PLAN_SMS_LIMITS (free:10, basic:50, pro/max: Number.MAX_SAFE_INTEGER)

### Google Drive
- 용도: 신청서별 작업 사진 폴더 자동 생성
- 인증: 서비스 계정 (`GOOGLE_SERVICE_ACCOUNT_JSON`)
- 폴더 구조: `일잇다 > 업체명 > 고객명_날짜 > 작업전 / 작업후`
- 연동 API: `PATCH /api/admin/integrations/drive`

### Slack
- 용도: 작업 완료 알림 발송
- Webhook URL: `https://hooks.slack.com/services/T09BN0PG9SQ/B0ANGTDLYFM/...`

---

## 공통 UI 컴포넌트 (`src/components/ui/`)

| 컴포넌트 | 설명 |
|----------|------|
| `Button` | 버튼 (variant: primary/secondary/ghost/danger) |
| `Card` | 카드 컨테이너 (padding: sm/md/lg) |
| `Input` | 텍스트 입력 |
| `Modal` | 다이얼로그 오버레이 |
| `Badge` | 뱃지/라벨 |
| `EmptyState` | 빈 상태 표시 |
| `SectionHeader` | 섹션 제목 (level: page/section/sub) |
| `UpgradeModal` | 플랜 업그레이드 안내 모달 |
| `HelpBanner` | 도움말 배너 (Drawer 열기 트리거) |
| `HelpDrawer` | 슬라이드 도움말 서랍 |
| `HelpTip` | 인라인 도움말 텍스트 |
| `HelpIcon` | 물음표 아이콘 툴팁 |
| `LoginPrompt` | 로그인 유도 모달 |

---

## 환경변수

```
NEXT_PUBLIC_SUPABASE_URL        # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase 익명 키
SUPABASE_SERVICE_ROLE_KEY       # 서비스 롤 키 (서버 전용, RLS 우회)
SOLAPI_API_KEY                  # Solapi API 키
SOLAPI_API_SECRET               # Solapi 시크릿
SOLAPI_FROM_PHONE               # SMS 발신 번호
GOOGLE_SERVICE_ACCOUNT_JSON     # Google Drive 서비스 계정 JSON
```

---

## 디자인 시스템 핵심 토큰

```
텍스트: text-text-primary / text-text-secondary / text-text-tertiary
배경:   bg-surface / bg-surface-sunken
테두리: border-border-subtle / border-border / border-border-strong
상태:   text-state-success / text-state-warning / text-state-danger / text-state-info
브랜드: bg-brand-600 / text-brand-600

카드:   rounded-2xl (고정)
버튼:   rounded-lg
입력:   rounded-md

그림자: shadow-flat / shadow-soft(기본) / shadow-card(hover) / shadow-pop / shadow-modal
간격:   8pt 그리드 (gap-4/5/6, p-4/6)
하단:   pb-24 (모바일 네비 안전 여백)
```
