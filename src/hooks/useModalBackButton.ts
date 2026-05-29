import { useEffect, useRef } from 'react'

/**
 * 모달/패널/드로어가 열려있을 때 브라우저/모바일 뒤로가기 버튼이
 * 페이지 이탈 대신 해당 UI를 닫도록 인터셉트한다.
 *
 * - isOpen=true  → history에 해시(#modal-open) 더미 entry 추가 + popstate 리스너 등록
 * - popstate 발생 → onClose() 호출 (뒤로가기로 닫힘)
 * - X버튼 등으로 프로그래밍 닫기 → replaceState로 해시 제거
 *
 * 해시(#)만 변경하는 이유:
 * - 경로/쿼리 pushState는 Kakao 인앱브라우저·Capacitor WebView 일부 버전에서
 *   실제 페이지 탐색으로 처리되어 "This page couldn't load" 오류 유발
 * - Next.js App Router도 경로 pushState를 라우팅 이벤트로 감지할 수 있음
 * - 해시 변경은 HTTP 요청이 없고 어떤 WebView도 탐색으로 오해하지 않음
 */
export function useModalBackButton(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const didPopRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    // 해시만 변경 — 경로 변경 없이 history entry 추가 (WebView 탐색 오해 방지)
    const baseUrl = window.location.pathname + window.location.search
    window.history.pushState({ __modalBackButton: true }, '', baseUrl + '#modal-open')
    didPopRef.current = false

    function handlePopState() {
      didPopRef.current = true
      onCloseRef.current()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (!didPopRef.current && window.history.state?.__modalBackButton) {
        // 해시 제거 — 더미 entry 소비
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
  }, [isOpen])
}
