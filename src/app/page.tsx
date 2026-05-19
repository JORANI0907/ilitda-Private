import { redirect } from 'next/navigation'

// 루트("/")는 로그인 페이지로 리다이렉트
export default function RootPage() {
  redirect('/login')
}
