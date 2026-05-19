import { redirect } from 'next/navigation'

// public-first: 루트("/")는 사업자 홈으로 — 비로그인 사용자도 UI·DB 열람 가능
export default function RootPage() {
  redirect('/business/home')
}
