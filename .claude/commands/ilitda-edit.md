---
description: ILITDA_PROJECT.md를 읽고 지정한 기능을 수정합니다
argument-hint: "[수정할 기능 또는 페이지 설명]"
---

# /ilitda-edit — 일잇다 앱 수정

`$ARGUMENTS`를 분석해 수정할 파일을 특정하고 변경을 적용합니다.

---

## 첫 번째 필수 동작 — 프로젝트 컨텍스트 로드

작업 전 반드시 아래 파일을 Read 도구로 읽습니다:

```
C:\Users\user\BBK-Workspace\apps\ilitda\ILITDA_PROJECT.md
```

이 파일에는 모든 페이지 경로, API 라우트, 플랜 기능 테이블, 절대 깨지면 안 되는 연동 규칙이 담겨 있습니다. 읽지 않고 작업을 시작하면 기존 연동이 깨질 수 있습니다.

---

## 프로젝트 기준 정보

| 항목 | 값 |
|------|-----|
| 작업 디렉토리 | `C:\Users\user\BBK-Workspace\apps\ilitda` |
| 배포 URL | https://ilitda.vercel.app |
| 프레임워크 | Next.js App Router + TypeScript |
| 스타일 | Tailwind CSS + 시멘틱 토큰 |
| DB | Supabase (`ilitda` 스키마 — `public` 아님) |
| 미들웨어 | `src/proxy.ts` (middleware.ts 파일 생성 절대 금지) |
| SMS | Solapi |

---

## 핵심 규칙 (수정 전 반드시 확인)

### 절대 금지
- `middleware.ts` 파일 생성 금지 → 빌드 오류 발생 (`src/proxy.ts` 사용)
- Supabase 쿼리 시 스키마 명시 누락 금지 → `.schema('ilitda')` 필수
- 플랜 게이트 추가 시 `isGuest` 예외 누락 금지 → 데모 접근 차단됨

### 플랜 게이트 패턴
```tsx
// 반드시 isGuest 포함
if (!isGuest && !canUseFeature(planType, 'feature_name')) {
  setUpgradeOpen(true)
  return
}
```

### 인증 패턴
- `usePlanType()` → `/api/auth/profile` 호출, `{ planType, isLoading }` 반환
- `AuthContext` → `user`, `isLoading` 제공
- 게스트 판별: `!auth?.isLoading && !auth?.user`
- 데모 응답: `isDemo: true` 플래그 포함

---

## 실행 절차

### 1단계 — ILITDA_PROJECT.md 로드

```
Read: C:\Users\user\BBK-Workspace\apps\ilitda\ILITDA_PROJECT.md
```

### 2단계 — 요청 분석

`$ARGUMENTS`에서 파악합니다:
- **수정 대상**: 어느 페이지·API·컴포넌트인지
- **변경 종류**: 기능 추가 / 버그 수정 / UI 변경 / 플랜 게이트 추가
- **영향 범위**: 연관된 API 라우트, 타입, 컴포넌트

### 3단계 — 관련 파일 읽기

수정 전 반드시 Read 도구로 대상 파일 전체를 읽습니다. 내용을 추정하지 않습니다.

### 4단계 — 코드 수정

ILITDA_PROJECT.md의 규칙을 준수하며 기존 패턴을 따릅니다:
- 요청하지 않은 리팩터링/구조 변경 금지
- 불변성 유지 (spread 패턴 사용)
- 파일당 최대 800줄

### 5단계 — TypeScript 검증

```bash
cd "C:/Users/user/BBK-Workspace/apps/ilitda" && npx tsc --noEmit 2>&1 | head -40
```

오류가 있으면 즉시 수정합니다.

### 6단계 — Slack 알림

```bash
# SLACK_WEBHOOK_URL 은 전역 CLAUDE.md 참고
curl -s -X POST -H 'Content-type: application/json' \
  --data '{"text":"✅ *작업완료* | ilitda [$ARGUMENTS]"}' \
  "$SLACK_WEBHOOK_URL"
```

### 7단계 — 완료 보고

- 수정된 파일 목록 (경로 포함)
- TypeScript 오류 여부
- 깨진 연동 없음 확인 여부

---

## 사용 예시

```
/ilitda-edit 작업자 페이지에서 프리 플랜 한도 초과 시 모달 보이도록
/ilitda-edit 프로필 페이지 앱 이름 입력 필드 disabled 상태 추가
/ilitda-edit SMS 발송 API 일일 한도 서버 차단 구현
/ilitda-edit 플랜 비교 테이블 Pro 항목 설명 텍스트 수정
/ilitda-edit 대시보드 통계 카드 레이아웃 개선
```
