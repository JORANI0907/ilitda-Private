import { useEffect, useRef } from 'react'

/**
 * 모달/패널/드로어가 열려있을 때 브라우저/모바일 뒤로가기 버튼이
 * 페이지 이탈 대신 해당 UI를 닫도록 인터셉트한다.
 *
 * - isOpen=true  → history에 더미 entry 추가 + popstate 리스너 등록
 * - popstate 발생 → onClose() 호출 (뒤로가기로 닫힘)
 * - X버튼 등으로 프로그래밍 닫기 → replaceState로 더미 entry 소비
 *
 * 주의: pushState/replaceState URL은 반드시 상대경로(pathname)만 사용.
 * 풀 URL(https://...)을 넣으면 Kakao 인앱브라우저·Capacitor WebView 일부
 * 버전에서 실제 페이지 탐색으로 처리되어 "This page couldn't load" 오류 유발.
 */
export function useModalBackButton(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const didPopRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    // 상대경로만 사용 — 풀 URL은 일부 WebView에서 실제 탐색을 유발함
    const currentPath = window.location.pathname + window.location.search + window.location.hash
    window.history.pushState({ __modalBackButton: true }, '', currentPath)
    didPopRef.current = false

    function handlePopState() {
      didPopRef.current = true
      onCloseRef.current()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (!didPopRef.current && window.history.state?.__modalBackButton) {
        const path = window.location.pathname + window.location.search + window.location.hash
        window.history.replaceState(null, '', path)
      }
    }
  }, [isOpen])
}
