import { useEffect, useRef } from 'react'

/**
 * 모달/패널/드로어가 열려있을 때 브라우저/모바일 뒤로가기 버튼이
 * 페이지 이탈 대신 해당 UI를 닫도록 인터셉트한다.
 *
 * - isOpen=true  → history에 더미 entry 추가 + popstate 리스너 등록
 * - popstate 발생 → onClose() 호출 (뒤로가기로 닫힘)
 * - X버튼 등으로 프로그래밍 닫기 → replaceState로 더미 entry 소비
 *   (go(-1) 대신 replaceState 사용: Capacitor/인앱 WebView에서 go(-1)이
 *    앱 히스토리 밖으로 이탈해 "This page couldn't load" 오류 유발)
 */
export function useModalBackButton(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const didPopRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    // URL을 명시적으로 지정해 WebView 호환성 확보
    window.history.pushState({ __modalBackButton: true }, '', window.location.href)
    didPopRef.current = false

    function handlePopState() {
      didPopRef.current = true
      onCloseRef.current()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (!didPopRef.current && window.history.state?.__modalBackButton) {
        // go(-1) 대신 replaceState 사용:
        // Capacitor WebView / 인앱브라우저에서 go(-1)이 앱 히스토리 밖으로
        // 이탈해 "This page couldn't load" 오류를 유발하는 문제를 방지함
        window.history.replaceState(null, '', window.location.href)
      }
    }
  }, [isOpen])
}
