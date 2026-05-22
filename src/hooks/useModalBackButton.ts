import { useEffect, useRef } from 'react'

/**
 * 모달/패널/드로어가 열려있을 때 브라우저/모바일 뒤로가기 버튼이
 * 페이지 이탈 대신 해당 UI를 닫도록 인터셉트한다.
 *
 * - isOpen=true  → history에 더미 entry 추가 + popstate 리스너 등록
 * - popstate 발생 → onClose() 호출 (뒤로가기로 닫힘)
 * - X버튼 등으로 프로그래밍 닫기 → 더미 entry를 history.go(-1)로 제거
 */
export function useModalBackButton(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const didPopRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    window.history.pushState({ __modalBackButton: true }, '')
    didPopRef.current = false

    function handlePopState() {
      didPopRef.current = true
      onCloseRef.current()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (!didPopRef.current) {
        window.history.go(-1)
      }
    }
  }, [isOpen])
}
