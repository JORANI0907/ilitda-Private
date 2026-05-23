'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-surface">
      {/* 상단 네비 */}
      <div className="sticky top-0 z-10 bg-surface border-b border-border-subtle">
        <div className="flex items-center gap-3 px-4 h-14 max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-text-primary">개인정보처리방침</h1>
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-16 space-y-6 text-sm text-text-primary leading-relaxed">
        <p className="text-text-tertiary text-xs">시행일: 2026년 5월 24일</p>

        <p className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-text-secondary text-xs leading-relaxed">
          일잇다(이하 "회사")는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고
          이와 관련한 고충을 신속하게 처리할 수 있도록 다음과 같이 개인정보처리방침을
          수립·공개합니다.
        </p>

        {/* 제1조 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제1조 (수집하는 개인정보 항목)
          </h2>
          <p>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>

          <div className="space-y-3">
            <div>
              <h3 className="font-semibold mb-1">① 회원 가입 시 (필수)</h3>
              <ul className="list-disc list-inside space-y-1 pl-2 text-text-secondary">
                <li>이름, 이메일 주소, 비밀번호, 휴대폰 번호</li>
                <li>이용자 유형(사업자/작업자)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-1">② 사업자 회원 추가 정보 (선택)</h3>
              <ul className="list-disc list-inside space-y-1 pl-2 text-text-secondary">
                <li>상호명, 사업자등록번호, 사업장 주소</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-1">③ 작업자 회원 추가 정보 (선택)</h3>
              <ul className="list-disc list-inside space-y-1 pl-2 text-text-secondary">
                <li>생년월일, 금융기관명, 계좌번호</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-1">④ 서비스 이용 과정에서 자동 수집</h3>
              <ul className="list-disc list-inside space-y-1 pl-2 text-text-secondary">
                <li>서비스 이용 기록, 접속 로그, 접속 IP 정보, 기기 정보(OS, 브라우저 종류)</li>
                <li>결제 기록 (유료 플랜 이용 시)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-1">⑤ 서비스 내 이용자 입력 데이터</h3>
              <ul className="list-disc list-inside space-y-1 pl-2 text-text-secondary">
                <li>사업자가 등록한 고객 정보 (고객명, 주소, 연락처 등)</li>
                <li>사업자가 등록한 작업자 정보 (이름, 연락처, 계좌 정보 등)</li>
                <li>서비스 신청서, 견적서, 계약서 내 기재 정보</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 제2조 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제2조 (개인정보의 수집 및 이용 목적)
          </h2>
          <p>회사는 수집한 개인정보를 다음의 목적으로 이용합니다.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-surface-sunken">
                  <th className="border border-border p-2 text-left font-semibold">이용 목적</th>
                  <th className="border border-border p-2 text-left font-semibold">수집 항목</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                <tr>
                  <td className="border border-border p-2">회원 가입 및 관리, 본인 확인</td>
                  <td className="border border-border p-2">이름, 이메일, 휴대폰 번호, 비밀번호</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">서비스 제공 (인력 관리, 신청서, 계약서 등)</td>
                  <td className="border border-border p-2">이용자 입력 데이터 전체</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">SMS 인증 및 알림 발송</td>
                  <td className="border border-border p-2">휴대폰 번호</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">유료 플랜 결제 처리</td>
                  <td className="border border-border p-2">결제 정보</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">서비스 개선 및 신규 기능 개발</td>
                  <td className="border border-border p-2">서비스 이용 기록, 접속 로그</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">법적 의무 이행 및 분쟁 해결</td>
                  <td className="border border-border p-2">관련 필요 정보 일체</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 제3조 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제3조 (개인정보의 보유 및 이용 기간)
          </h2>
          <ol className="list-decimal list-inside space-y-2 pl-2">
            <li>
              회사는 개인정보 수집 및 이용 목적이 달성된 후 지체 없이 해당 정보를 파기합니다.
              단, 다음 각 호의 경우에는 해당 기간 동안 보존합니다.
            </li>
          </ol>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-surface-sunken">
                  <th className="border border-border p-2 text-left font-semibold">보존 항목</th>
                  <th className="border border-border p-2 text-left font-semibold">보존 기간</th>
                  <th className="border border-border p-2 text-left font-semibold">근거</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                <tr>
                  <td className="border border-border p-2">계약 또는 청약철회 기록</td>
                  <td className="border border-border p-2">5년</td>
                  <td className="border border-border p-2">전자상거래법</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">대금 결제 및 재화 공급 기록</td>
                  <td className="border border-border p-2">5년</td>
                  <td className="border border-border p-2">전자상거래법</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">소비자 불만 또는 분쟁 처리 기록</td>
                  <td className="border border-border p-2">3년</td>
                  <td className="border border-border p-2">전자상거래법</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">접속 로그</td>
                  <td className="border border-border p-2">3개월</td>
                  <td className="border border-border p-2">통신비밀보호법</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            2. 회원 탈퇴 시, 법령에서 정한 보존 기간을 제외한 개인정보는 지체 없이 파기합니다.
          </p>
        </section>

        {/* 제4조 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제4조 (개인정보의 제3자 제공)
          </h2>
          <ol className="list-decimal list-inside space-y-2 pl-2">
            <li>
              회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
              다만 다음 각 호의 경우에는 예외로 합니다.
            </li>
          </ol>
          <ul className="list-disc list-inside space-y-1 pl-4 text-text-secondary">
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나 수사 목적으로 법령에서 정한 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            <li>서비스 이용 계약의 이행을 위해 필요한 경우로서 이용자가 동의한 경우</li>
          </ul>
          <p>
            사업자 회원이 서비스 내에서 작업자 회원의 정보를 수집·관리하는 행위는,
            사업자 회원이 별도의 개인정보 처리자로서의 책임을 집니다.
            회사는 해당 정보의 처리에 관한 직접적인 책임을 지지 않습니다.
          </p>
        </section>

        {/* 제5조 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제5조 (개인정보 처리 위탁)
          </h2>
          <p>
            회사는 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁합니다.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-surface-sunken">
                  <th className="border border-border p-2 text-left font-semibold">수탁업체</th>
                  <th className="border border-border p-2 text-left font-semibold">위탁 업무</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                <tr>
                  <td className="border border-border p-2">Supabase Inc.</td>
                  <td className="border border-border p-2">회원 인증 및 데이터베이스 관리</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Vercel Inc.</td>
                  <td className="border border-border p-2">서비스 호스팅 및 배포</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">솔라피(Solapi)</td>
                  <td className="border border-border p-2">SMS 문자 발송</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Google LLC</td>
                  <td className="border border-border p-2">파일 저장(Google Drive)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 제6조 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제6조 (정보주체의 권리·의무 및 행사 방법)
          </h2>
          <ol className="list-decimal list-inside space-y-2 pl-2">
            <li>
              이용자는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
            </li>
          </ol>
          <ul className="list-disc list-inside space-y-1 pl-4 text-text-secondary">
            <li>개인정보 열람 요구</li>
            <li>오류 등이 있을 경우 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리 정지 요구</li>
          </ul>
          <p>
            상기 권리의 행사는 서비스 내 설정 메뉴 또는 고객센터를 통해 할 수 있으며,
            회사는 이에 대해 지체 없이 조치합니다.
          </p>
          <p>
            만 14세 미만 아동의 개인정보 보호를 위해 회사는 만 14세 미만 아동의 회원 가입을 허용하지 않습니다.
          </p>
        </section>

        {/* 제7조 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제7조 (개인정보의 안전성 확보 조치)
          </h2>
          <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취합니다.</p>
          <ul className="list-disc list-inside space-y-1 pl-4 text-text-secondary">
            <li>관리적 조치: 내부 관리계획 수립, 임직원 개인정보 처리 관련 교육 실시</li>
            <li>기술적 조치: 개인정보 암호화(TLS/SSL), 접근 권한 관리 및 로그 기록</li>
            <li>물리적 조치: 데이터 센터 보안 유지 (위탁 업체의 보안 정책 적용)</li>
            <li>비밀번호 단방향 암호화(해시) 저장</li>
          </ul>
        </section>

        {/* 제8조 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제8조 (개인정보 자동 수집 장치의 설치·운영 및 거부)
          </h2>
          <p>
            회사는 서비스 개선 및 이용자 경험 향상을 위해 쿠키(Cookie)를 사용할 수 있습니다.
            이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으며, 이 경우 서비스 일부 기능이
            제한될 수 있습니다.
          </p>
        </section>

        {/* 제9조 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제9조 (개인정보 보호책임자)
          </h2>
          <p>
            회사는 개인정보 처리에 관한 업무를 총괄하고 개인정보 처리와 관련한 이용자의 불만 처리 및
            피해 구제를 위해 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
          </p>
          <div className="bg-surface-sunken rounded-xl p-4 space-y-1 text-text-secondary">
            <p><span className="font-medium text-text-primary">개인정보 보호책임자</span>: 일잇다 운영팀</p>
            <p><span className="font-medium text-text-primary">연락처</span>: 서비스 내 고객센터를 통해 문의</p>
          </div>
          <p>
            이용자는 회사의 서비스를 이용하면서 발생한 모든 개인정보 보호 관련 문의, 불만 처리,
            피해 구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.
          </p>
        </section>

        {/* 제10조 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제10조 (권익 침해 구제 방법)
          </h2>
          <p>
            이용자는 개인정보 침해로 인한 구제를 받기 위하여 개인정보 분쟁조정위원회,
            한국인터넷진흥원 개인정보 침해신고센터 등에 분쟁 해결이나 상담을 신청할 수 있습니다.
          </p>
          <ul className="list-disc list-inside space-y-1 pl-4 text-text-secondary">
            <li>개인정보 침해신고센터: privacy.kisa.or.kr / 국번 없이 118</li>
            <li>개인정보 분쟁조정위원회: www.kopico.go.kr / (1833-6972)</li>
            <li>대검찰청 사이버범죄수사단: www.spo.go.kr / 02-3480-3573</li>
            <li>경찰청 사이버안전국: ecrm.cyber.go.kr / 국번 없이 182</li>
          </ul>
        </section>

        {/* 제11조 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제11조 (개인정보처리방침의 변경)
          </h2>
          <p>
            이 개인정보처리방침은 2026년 5월 24일부터 시행됩니다.
            이전의 개인정보처리방침은 서비스 내 고객센터를 통해 확인하실 수 있습니다.
            방침이 변경될 경우 시행 7일 전부터 서비스 내 공지사항을 통해 고지합니다.
          </p>
        </section>

        <p className="text-text-tertiary text-xs pt-4 border-t border-border-subtle">
          본 개인정보처리방침은 2026년 5월 24일부터 시행됩니다.
        </p>
      </div>
    </div>
  )
}
