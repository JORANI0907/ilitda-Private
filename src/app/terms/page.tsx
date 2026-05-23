'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export default function TermsPage() {
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
          <h1 className="text-base font-semibold text-text-primary">이용약관</h1>
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-16 space-y-6 text-sm text-text-primary leading-relaxed">
        <p className="text-text-tertiary text-xs">시행일: 2026년 5월 24일</p>

        {/* 제1장 총칙 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제1장 총칙
          </h2>

          <div className="space-y-2">
            <h3 className="font-semibold">제1조 (목적)</h3>
            <p>
              이 약관은 일잇다(이하 "회사")가 제공하는 일잇다 서비스(이하 "서비스")의 이용 조건 및 절차,
              회사와 이용자 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">제2조 (용어의 정의)</h3>
            <p>이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>
                <span className="font-medium">"서비스"</span>란 회사가 제공하는 일잇다 플랫폼
                및 그에 부수하는 일체의 서비스를 의미합니다.
              </li>
              <li>
                <span className="font-medium">"이용자"</span>란 이 약관에 동의하고 서비스를
                이용하는 사업자 및 작업자를 말합니다.
              </li>
              <li>
                <span className="font-medium">"사업자 회원"</span>이란 서비스에 사업자로 가입하여
                인력 채용·관리, 서비스 신청 관리 등의 기능을 이용하는 회원을 말합니다.
              </li>
              <li>
                <span className="font-medium">"작업자 회원"</span>이란 서비스에 작업자로 가입하여
                사업자와 연결되어 업무를 수행하는 회원을 말합니다.
              </li>
              <li>
                <span className="font-medium">"계정"</span>이란 이용자가 서비스 이용을 위해
                등록한 이메일 주소 또는 전화번호를 말합니다.
              </li>
              <li>
                <span className="font-medium">"플랜"</span>이란 회사가 제공하는 서비스 이용 등급
                (Free, Basic, Pro, Max 등)을 말합니다.
              </li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">제3조 (약관의 효력 및 변경)</h3>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>
                이 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다.
              </li>
              <li>
                회사는 「약관의 규제에 관한 법률」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」
                등 관련 법령을 위반하지 않는 범위에서 이 약관을 개정할 수 있습니다.
              </li>
              <li>
                약관 개정 시 회사는 적용일자 7일 전부터 서비스 내 공지사항 또는 이메일을 통해
                공지합니다. 다만, 이용자에게 불리한 변경의 경우 30일 전에 공지합니다.
              </li>
              <li>
                이용자가 변경된 약관의 효력 발생일 이후에도 서비스를 계속 이용하는 경우,
                변경된 약관에 동의한 것으로 간주합니다.
              </li>
            </ol>
          </div>
        </section>

        {/* 제2장 서비스 이용계약 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제2장 서비스 이용계약
          </h2>

          <div className="space-y-2">
            <h3 className="font-semibold">제4조 (이용 신청)</h3>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>
                서비스 이용 계약은 이용자가 약관에 동의한 후 이용 신청을 하고,
                회사가 이를 승낙함으로써 성립합니다.
              </li>
              <li>
                회사는 다음 각 호에 해당하는 이용 신청에 대해서는 승낙을 거부하거나
                사후에 이용 계약을 해지할 수 있습니다.
              </li>
            </ol>
            <ul className="list-disc list-inside space-y-1 pl-4 text-text-secondary">
              <li>타인의 정보를 도용하거나 허위 정보를 기재한 경우</li>
              <li>만 14세 미만인 경우</li>
              <li>이전에 약관 위반으로 이용 제한된 이력이 있는 경우</li>
              <li>기타 관계 법령 위반 또는 사회 질서에 반하는 목적으로 신청한 경우</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">제5조 (계정 관리)</h3>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>이용자는 자신의 계정 정보를 정확하게 유지할 책임이 있습니다.</li>
              <li>
                이용자는 계정 정보를 제3자에게 제공, 대여, 양도, 공유해서는 안 됩니다.
              </li>
              <li>
                계정 도용 또는 무단 사용이 확인된 경우 즉시 회사에 통보하여야 하며,
                통보하지 않아 발생한 손해에 대해 회사는 책임을 지지 않습니다.
              </li>
            </ol>
          </div>
        </section>

        {/* 제3장 서비스 제공 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제3장 서비스 제공
          </h2>

          <div className="space-y-2">
            <h3 className="font-semibold">제6조 (서비스 내용)</h3>
            <p>회사는 다음의 서비스를 제공합니다.</p>
            <ul className="list-disc list-inside space-y-1 pl-4 text-text-secondary">
              <li>인력(작업자) 관리 및 매칭 중개 서비스</li>
              <li>서비스 신청서 및 견적서 관리 도구</li>
              <li>근태·급여·재고 관리 도구</li>
              <li>계약서 작성 및 전자서명 도구</li>
              <li>SMS 알림 발송 연동 서비스</li>
              <li>기타 회사가 추가 개발하거나 제휴를 통해 제공하는 서비스</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">제7조 (서비스 변경 및 중단)</h3>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>
                회사는 서비스의 내용, 기능, 요금 등을 변경할 수 있으며, 변경 사항은
                서비스 공지를 통해 사전 고지합니다.
              </li>
              <li>
                회사는 다음 각 호의 경우 사전 통지 없이 서비스를 일시 중단하거나
                종료할 수 있습니다.
              </li>
            </ol>
            <ul className="list-disc list-inside space-y-1 pl-4 text-text-secondary">
              <li>서버 점검, 교체, 장애 등 기술적 사유</li>
              <li>천재지변, 국가비상사태, 정전 등 불가항력적 사유</li>
              <li>전기통신사업법에 따른 기간통신사업자의 서비스 중단</li>
              <li>서비스 운영상 필요하다고 합리적으로 판단되는 경우</li>
            </ul>
            <p className="text-text-secondary">
              서비스 중단으로 인한 손해에 대해 회사는 고의 또는 중과실이 없는 한 책임을 지지 않습니다.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">제8조 (플랜 및 유료 서비스)</h3>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>
                회사는 Free, Basic, Pro, Max 플랜을 제공하며, 각 플랜별 제공 기능과
                가격은 서비스 내 안내 페이지에서 확인할 수 있습니다.
              </li>
              <li>
                유료 플랜 이용 요금은 해당 플랜 신청 시점에 공지된 금액을 기준으로 합니다.
              </li>
              <li>
                이용자가 유료 서비스를 해지하거나 플랜을 다운그레이드하는 경우,
                회사의 환불 정책에 따라 처리되며, 이미 사용한 기간에 대한 요금은 환불되지 않습니다.
              </li>
              <li>
                회사는 사전 공지 후 요금 정책을 변경할 수 있으며, 변경된 요금은
                다음 결제 시점부터 적용됩니다.
              </li>
            </ol>
          </div>
        </section>

        {/* 제4장 이용자 의무 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제4장 이용자 의무
          </h2>

          <div className="space-y-2">
            <h3 className="font-semibold">제9조 (이용자의 의무)</h3>
            <p>이용자는 다음 각 호의 행위를 하여서는 안 됩니다.</p>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>가입 신청 또는 정보 변경 시 허위 사실 기재</li>
              <li>타인의 개인정보 및 계정 정보 도용</li>
              <li>회사 또는 제3자의 지식재산권, 명예, 신용 등 권리를 침해하는 행위</li>
              <li>서비스를 이용하여 얻은 정보를 회사의 사전 동의 없이 영리 목적으로 사용하거나 제3자에게 제공하는 행위</li>
              <li>회사의 서비스 운영을 방해하는 행위(해킹, 악성코드 배포, 과부하 유발 등)</li>
              <li>불법 스팸, 음란물, 혐오 발언 등 불법 콘텐츠 유통</li>
              <li>관계 법령 또는 이 약관에 위반하는 행위</li>
              <li>기타 사회 통념상 허용되지 않는 행위</li>
            </ol>
          </div>
        </section>

        {/* 제5장 서비스 이용 제한 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제5장 서비스 이용 제한
          </h2>

          <div className="space-y-2">
            <h3 className="font-semibold">제10조 (이용 제한 및 계약 해지)</h3>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>
                회사는 이용자가 제9조를 위반하거나 다음 각 호에 해당하는 경우,
                사전 통보 없이 해당 이용자의 서비스 이용을 제한하거나 계약을 해지할 수 있습니다.
              </li>
            </ol>
            <ul className="list-disc list-inside space-y-1 pl-4 text-text-secondary">
              <li>동일 계정으로 반복적인 약관 위반 행위</li>
              <li>타인을 사칭하거나 타인의 개인정보를 무단 이용한 경우</li>
              <li>유료 서비스 이용 요금 미납 또는 결제 취소</li>
              <li>서비스의 정상적인 운영을 방해하는 행위</li>
            </ul>
            <p>
              이용 제한 또는 계약 해지로 인한 손해에 대해 이용자가 귀책 사유가 있는 경우
              회사는 이에 대한 책임을 지지 않습니다.
            </p>
          </div>
        </section>

        {/* 제6장 책임 제한 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제6장 책임 제한 및 면책
          </h2>

          <div className="space-y-2">
            <h3 className="font-semibold">제11조 (회사의 책임 제한)</h3>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>
                회사는 천재지변, 전쟁, 테러, 정부 규제, 통신 장애 등 불가항력적 사유로
                서비스를 제공하지 못하는 경우 책임을 지지 않습니다.
              </li>
              <li>
                회사는 이용자의 귀책 사유로 발생한 서비스 이용 장애에 대해 책임을 지지 않습니다.
              </li>
              <li>
                회사는 서비스를 통해 사업자와 작업자 간 이루어지는 거래·계약·분쟁에 대해
                중개자 역할을 할 뿐이며, 해당 거래의 당사자가 아닙니다. 사업자-작업자 간
                발생하는 일체의 분쟁에 대해 회사는 직접적인 책임을 지지 않습니다.
              </li>
              <li>
                회사는 이용자가 서비스를 이용하여 기대하는 수익을 얻지 못하거나
                서비스를 통해 취득한 정보로 인해 발생한 손해에 대해 책임을 지지 않습니다.
              </li>
              <li>
                회사는 이용자가 서비스에 게시하거나 입력한 정보의 정확성, 신뢰성에 대해
                보증하지 않으며, 해당 정보로 인한 손해에 대해 책임을 지지 않습니다.
              </li>
              <li>
                회사가 손해를 배상하여야 하는 경우, 그 배상 범위는 이용자가 지급한
                최근 3개월간의 서비스 이용 요금을 초과하지 않습니다.
              </li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">제12조 (지식재산권)</h3>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>
                서비스 내 회사가 제작한 콘텐츠, 소프트웨어, UI/UX 디자인 등 일체의
                지식재산권은 회사에 귀속됩니다.
              </li>
              <li>
                이용자는 회사의 명시적인 사전 동의 없이 서비스의 콘텐츠를 복제, 배포,
                수정하거나 제3자에게 제공할 수 없습니다.
              </li>
              <li>
                이용자가 서비스 내에 등록한 데이터(신청서, 고객 정보 등)의 소유권은
                해당 이용자에게 귀속됩니다. 단, 회사는 서비스 운영 및 개선을 위해
                해당 데이터를 익명화하여 활용할 수 있습니다.
              </li>
            </ol>
          </div>
        </section>

        {/* 제7장 개인정보 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제7장 개인정보 보호
          </h2>

          <div className="space-y-2">
            <h3 className="font-semibold">제13조 (개인정보 보호)</h3>
            <p>
              회사는 이용자의 개인정보를 「개인정보 보호법」 등 관련 법령에 따라 보호합니다.
              개인정보의 수집·이용·제공 등에 관한 사항은 별도의 개인정보처리방침에 따릅니다.
            </p>
          </div>
        </section>

        {/* 제8장 분쟁 해결 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary border-b border-border-subtle pb-2">
            제8장 분쟁 해결 및 기타
          </h2>

          <div className="space-y-2">
            <h3 className="font-semibold">제14조 (분쟁 해결)</h3>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>
                서비스 이용과 관련하여 분쟁이 발생한 경우 회사와 이용자는 상호 협의를 통해
                해결을 위해 노력합니다.
              </li>
              <li>
                협의가 이루어지지 않을 경우 「콘텐츠산업 진흥법」에 따른 콘텐츠분쟁조정위원회에
                분쟁 조정을 신청하거나 소송을 제기할 수 있습니다.
              </li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">제15조 (준거법 및 관할 법원)</h3>
            <p>
              이 약관과 관련한 모든 분쟁에는 대한민국 법률이 적용됩니다.
              회사와 이용자 간의 소송은 민사소송법상의 관할 법원을 제1심 관할 법원으로 합니다.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">제16조 (연락처)</h3>
            <p>
              서비스 이용 관련 문의는 서비스 내 고객센터를 통해 접수하시기 바랍니다.
            </p>
          </div>
        </section>

        <p className="text-text-tertiary text-xs pt-4 border-t border-border-subtle">
          본 약관은 2026년 5월 24일부터 시행됩니다.
        </p>
      </div>
    </div>
  )
}
