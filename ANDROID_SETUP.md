# Android 빌드 가이드

## 사전 준비

1. Android Studio 설치 (https://developer.android.com/studio)
2. Google Play Console 가입 ($25)
3. Firebase Console에서 프로젝트 생성
   - Android 앱 추가: kr.ilitda.app
   - google-services.json 다운로드
   - android/app/ 폴더에 복사

## 최초 설치 순서

```bash
# 1. 패키지 설치 (최초 1회)
npm install @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6 @capacitor/geolocation@6 @capacitor/push-notifications@6 @capacitor/status-bar@6 @capacitor/splash-screen@6

# 2. Capacitor 초기화 (최초 1회)
npx cap init "일잇다" "kr.ilitda.app" --web-dir=out

# 3. Android 플랫폼 추가 (최초 1회)
npx cap add android
```

## 빌드 명령어

```bash
npm run build:android   # Next.js 빌드 + Capacitor 동기화
npm run cap:sync        # Capacitor 동기화만
npm run cap:open        # Android Studio 열기
```

## 릴리즈 빌드

Android Studio에서:
1. Build > Generate Signed Bundle/APK
2. Android App Bundle (AAB) 선택
3. 키스토어 생성 또는 기존 키스토어 선택
4. Google Play에 업로드

## 개발 시 로컬 서버 연결

`capacitor.config.ts`에서 server 섹션 주석 해제:
```typescript
server: {
  androidScheme: 'https',
  url: 'http://192.168.x.x:3000',  // 실제 로컬 IP로 변경
  cleartext: true
}
```

로컬 IP 확인: `ipconfig` (Windows) 또는 `ifconfig` (macOS/Linux)

## 주의사항

- google-services.json은 Git에 포함되지 않음 (.gitignore 처리됨)
- android/ 폴더는 Git에 포함되지 않음 — cap add android로 재생성
- 배포 빌드 시 server.url 주석 처리 필수
- Next.js output: 'export' 모드에서는 next start 불가 (정적 파일 전용)
- API Route Handler 사용 불가 (정적 export 제한) — Supabase 직접 호출로 대체
