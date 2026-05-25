'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, UserPlus, Phone, Link2, Check, ChevronRight, LogIn, MapPin, Search, X, ChevronLeft, Download } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpTip } from '@/components/ui/HelpTip'
import type { Connection } from '@/types'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import { usePlanType } from '@/hooks/usePlanType'
import { getFeatureLimit, getUpgradePlan } from '@/lib/plan-features'

type AddMode = 'invite' | 'manual'
type FilterTab = 'all' | 'accepted' | 'pending' | 'manual'

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'accepted', label: '연결됨' },
  { key: 'pending', label: '대기중' },
  { key: 'manual', label: '수동등록' },
]

const AVATAR_COLORS = [
  'bg-brand-100 text-brand-700',
  'bg-emerald-100 text-emerald-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
]

function getAvatarColor(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

function ConnectionBadge({ connection }: { connection: Connection }) {
  if (connection.is_manual) {
    return <Badge variant="default">수동등록</Badge>
  }
  if (connection.status === 'pending') {
    return <Badge variant="warning">초대중</Badge>
  }
  return <Badge variant="success">연결됨</Badge>
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

interface AddForm {
  name: string
  phone: string
  account_bank: string
  account_number: string
  registration_number: string
  company_name: string
}

const EMPTY_FORM: AddForm = {
  name: '',
  phone: '',
  account_bank: '',
  account_number: '',
  registration_number: '',
  company_name: '',
}

const HELP_SECTIONS = [
  {
    title: '초대 vs 직접 등록 차이',
    content: '초대 방식은 작업자 분께 SMS로 초대 링크를 발송합니다. 작업자가 앱에서 링크를 수락해야 연결이 완료됩니다.\n직접 등록은 앱 없이 즉시 등록되며, 이름·연락처·계좌 정보를 수동으로 관리합니다.',
  },
  {
    title: '연결 상태 의미',
    content: '연결됨 — 작업자가 앱 계정과 연결된 상태입니다. 출퇴근 체크와 일정 확인이 가능합니다.\n초대중 — SMS를 발송했지만 아직 수락하지 않은 상태입니다.\n수동등록 — 앱 없이 직접 등록된 작업자입니다.',
  },
  {
    title: '베이직 플랜 제한',
    content: '베이직 플랜에서는 작업자를 최대 10명까지 등록할 수 있습니다. 더 많은 인원이 필요하다면 상위 플랜으로 업그레이드해 주세요.',
  },
]

export default function WorkersPage() {
  const router = useRouter()
  const [helpOpen, setHelpOpen] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [connections, setConnections] = useState<Connection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const [showAddModal, setShowAddModal] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>('manual')
  const [form, setForm] = useState<AddForm>(EMPTY_FORM)
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const { planType, features, isLoading: planLoading } = usePlanType()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const fetchConnections = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/business/hr/connections')
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '불러오기에 실패했습니다.')
        return
      }
      setConnections(json.data ?? [])
      setIsDemo(json.isDemo === true)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const q = searchQuery.trim().toLowerCase()
  const searchFiltered = q
    ? connections.filter((c) =>
        [
          c.display_name,
          c.manual_name,
          c.manual_phone,
          c.profiles?.phone,
          c.profiles?.name,
          c.manual_address,
          c.manual_specialty,
          c.manual_skill_level,
          c.manual_company_name,
          c.manual_registration_number,
          c.manual_account_bank,
          c.manual_account_number,
        ].some((val) => val?.toLowerCase().includes(q))
      )
    : connections

  const filteredConnections = searchFiltered.filter((c) => {
    if (activeTab === 'all') return true
    if (activeTab === 'manual') return c.is_manual
    if (activeTab === 'accepted') return !c.is_manual && c.status === 'accepted'
    if (activeTab === 'pending') return !c.is_manual && c.status === 'pending'
    return true
  })

  const totalPages = Math.ceil(filteredConnections.length / pageSize)
  const paginatedConnections = filteredConnections.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  useEffect(() => { setCurrentPage(1) }, [activeTab, searchQuery, pageSize])

  const handleAdd = async () => {
    if (!form.name.trim()) {
      setAddError('이름을 입력해 주세요.')
      return
    }
    if (addMode === 'invite' && !form.phone.trim()) {
      setAddError('초대할 전화번호를 입력해 주세요.')
      return
    }
    setIsAdding(true)
    setAddError(null)
    try {
      const res = await fetch('/api/business/hr/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: addMode,
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          account_bank: form.account_bank.trim() || null,
          account_number: form.account_number.trim() || null,
          registration_number: form.registration_number.trim() || null,
          company_name: form.company_name.trim() || null,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setAddError(json.error ?? '추가에 실패했습니다.')
        return
      }

      if (addMode === 'invite') {
        setInviteSent(true)
      } else {
        setConnections((prev) => [json.data, ...prev])
        resetAddModal()
      }
    } catch {
      setAddError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleCopyLink = async (connection: Connection) => {
    const link = `${window.location.origin}/connect/${connection.invite_token}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(connection.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      alert(`초대 링크: ${link}`)
    }
  }

  const resetAddModal = () => {
    setShowAddModal(false)
    setAddMode('manual')
    setForm(EMPTY_FORM)
    setAddError(null)
    setInviteSent(false)
  }

  function handleOpenAdd() {
    const limit = getFeatureLimit(planType, 'worker_limit', features)
    if (!planLoading && connections.length >= limit) {
      setUpgradeOpen(true)
      return
    }
    setShowAddModal(true)
  }

  const setField = (key: keyof AddForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleExcelDownload() {
    if (filteredConnections.length === 0) return
    const XLSX = (await import('xlsx')).default
    const rows = filteredConnections.map((c) => ({
      '이름': c.display_name,
      '연결유형': c.is_manual ? '수동등록' : '앱연결',
      '상태': c.is_manual ? '수동등록' : c.status === 'accepted' ? '연결됨' : '초대중',
      '전화번호': c.manual_phone ?? c.profiles?.phone ?? '',
      '주소': c.manual_address ?? '',
      '특기/전문분야': c.manual_specialty ?? '',
      '숙련도': c.manual_skill_level ?? '',
      '은행': c.manual_account_bank ?? '',
      '계좌번호': c.manual_account_number ?? '',
      '사업자등록번호': c.manual_registration_number ?? '',
      '주민등록번호': c.manual_resident_number ?? '',
      '상호명': c.manual_company_name ?? '',
      '등록일': c.created_at.slice(0, 10),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '작업자목록')
    XLSX.writeFile(wb, `작업자목록_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-24">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 -ml-1 text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 flex items-center justify-between">
          <div>
            <SectionHeader title="작업자 관리" level="page" />
            {!planLoading && (() => {
              const limit = getFeatureLimit(planType, 'worker_limit', features)
              const isOver = connections.length >= limit
              const isNear = !isOver && limit !== Infinity && connections.length >= limit * 0.8
              if (limit === Infinity) {
                return (
                  <span className="text-xs px-2.5 py-0.5 rounded-full mt-1 inline-block bg-state-success/10 text-state-success font-medium">
                    무제한
                  </span>
                )
              }
              return (
                <span className={`text-xs px-2.5 py-0.5 rounded-full mt-1 inline-block font-medium ${
                  isOver ? 'bg-state-danger/10 text-state-danger' :
                  isNear ? 'bg-state-warning/10 text-state-warning' :
                  'bg-surface-sunken text-text-secondary'
                }`}>
                  {connections.length} / {limit}명
                </span>
              )
            })()}
          </div>
          <Button size="sm" onClick={handleOpenAdd} className="shrink-0">
            <UserPlus size={15} className="mr-1" />
            작업자 추가
          </Button>
        </div>
      </div>

      {/* 데모 배너 */}
      {isDemo && (
        <div className="flex items-center justify-between gap-3 bg-brand-50 border border-brand-200 rounded-2xl px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-700">데모 모드로 둘러보는 중이에요</p>
            <p className="text-xs text-brand-600 mt-0.5 break-keep">가입하면 나만의 사업장을 관리할 수 있어요.</p>
          </div>
          <Link href="/login/register" className="flex-shrink-0 flex items-center gap-1.5 bg-brand-600 text-white text-xs font-semibold px-3 h-9 rounded-lg hover:bg-brand-700 transition-colors">
            <LogIn size={14} /> 가입하기
          </Link>
        </div>
      )}

      <HelpBanner label="직원 관리 사용법 보기" onClick={() => setHelpOpen(true)} />
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="직원 관리 사용법"
        sections={HELP_SECTIONS}
      />

      {/* 탭 + 엑셀 다운로드 */}
      <div className="flex items-center gap-2 pb-1">
        <div className="flex gap-2 overflow-x-auto scrollbar-none flex-1 min-w-0">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`
                shrink-0 h-8 px-4 rounded-full text-sm font-medium transition-colors
                ${activeTab === tab.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-sunken text-text-secondary hover:bg-border'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleExcelDownload}
          disabled={filteredConnections.length === 0}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-brand-600 hover:bg-brand-50 disabled:opacity-30 transition-colors"
          title="엑셀 다운로드"
        >
          <Download size={16} />
        </button>
      </div>

      {/* 검색창 */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="이름, 전화번호, 주소, 특기, 상호명 등 검색"
          className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-400 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
            aria-label="검색 초기화"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* 목록 */}
      <div className="flex flex-col gap-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-surface rounded-2xl animate-pulse border border-border-subtle" />
        ))}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-state-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchConnections}>재시도</Button>
          </div>
        )}

        {!isLoading && !error && filteredConnections.length === 0 && (
          <EmptyState
            icon={<Users size={40} />}
            title={q ? '검색 결과가 없어요' : '작업자가 없어요'}
            description={q ? `"${searchQuery}"에 해당하는 작업자를 찾을 수 없습니다.` : '작업자를 수동으로 추가하거나 초대 SMS를 발송하세요.'}
            bordered
          />
        )}

        {!isLoading && !error && paginatedConnections.map((conn) => (
          <button
            key={conn.id}
            type="button"
            onClick={() => router.push(`/business/hr/workers/${conn.id}`)}
            className="bg-surface rounded-2xl border border-border-subtle shadow-soft p-4 flex items-center gap-3 text-left cursor-pointer hover:border-brand-200 hover:bg-brand-50/30 hover:shadow-card active:scale-[0.98] transition-all w-full"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-base font-bold ${getAvatarColor(conn.display_name)}`}>
              {conn.display_name.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-text-primary text-sm">{conn.display_name}</span>
                <ConnectionBadge connection={conn} />
                {conn.manual_skill_level && (
                  <span className="text-xs px-1.5 py-0.5 bg-brand-50 text-brand-600 rounded font-medium">
                    능력 {conn.manual_skill_level}
                  </span>
                )}
              </div>
              {(conn.manual_phone ?? conn.profiles?.phone) && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Phone size={11} className="text-text-tertiary shrink-0" />
                  <span className="text-xs text-text-secondary">
                    {conn.manual_phone ?? conn.profiles?.phone}
                  </span>
                </div>
              )}
              {conn.manual_address && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={11} className="text-text-tertiary shrink-0" />
                  <span className="text-xs text-text-secondary truncate">{conn.manual_address}</span>
                </div>
              )}
              {conn.manual_specialty && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-text-tertiary truncate">특기: {conn.manual_specialty}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {!conn.is_manual && conn.status === 'pending' && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleCopyLink(conn) }}
                  className="p-2 rounded-lg text-text-secondary hover:bg-surface-sunken transition-colors"
                  aria-label="초대 링크 복사"
                  title="초대 링크 복사"
                >
                  {copiedId === conn.id ? (
                    <Check size={16} className="text-state-success" />
                  ) : (
                    <Link2 size={16} />
                  )}
                </button>
              )}
              <ChevronRight size={16} className="text-text-tertiary" />
            </div>
          </button>
        ))}
      </div>

      {/* 페이지네이션 */}
      {!isLoading && !error && filteredConnections.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {[10, 20, 30].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setPageSize(size)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  pageSize === size
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-surface text-text-secondary border-border hover:border-brand-300 hover:text-brand-600'
                }`}
              >
                {size}명
              </button>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary disabled:opacity-30 hover:bg-surface-sunken transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-text-secondary px-1 min-w-[3rem] text-center">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary disabled:opacity-30 hover:bg-surface-sunken transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        featureName="직원 추가"
        requiredPlan={getUpgradePlan(planType) ?? 'pro'}
        currentPlan={planType}
      />

      {/* 작업자 추가 모달 */}
      <Modal
        open={showAddModal}
        onClose={resetAddModal}
        title="작업자 추가"
        footer={
          inviteSent ? (
            <Button fullWidth onClick={() => { fetchConnections(); resetAddModal() }}>
              확인
            </Button>
          ) : (
            <Button fullWidth onClick={handleAdd} isLoading={isAdding}>
              {addMode === 'invite' ? 'SMS 초대 발송' : '등록하기'}
            </Button>
          )
        }
      >
        {inviteSent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-state-success-bg flex items-center justify-center">
              <Check size={28} className="text-state-success" />
            </div>
            <p className="font-semibold text-text-primary">초대 링크를 발송했습니다</p>
            <p className="text-sm text-text-secondary break-keep">
              {form.phone}으로 초대 SMS가 발송되었습니다.
              작업자가 링크를 통해 앱에 접속하면 자동으로 연결됩니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 모드 탭 */}
            <div className="flex rounded-xl bg-surface-sunken p-1 gap-1">
              {(['invite', 'manual'] as AddMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setAddMode(mode); setAddError(null) }}
                  className={`
                    flex-1 h-9 rounded-lg text-sm font-medium transition-colors
                    ${addMode === mode
                      ? 'bg-surface text-text-primary shadow-soft'
                      : 'text-text-secondary hover:text-text-primary'}
                  `}
                >
                  {mode === 'invite' ? '초대하기' : '직접 등록'}
                </button>
              ))}
            </div>

            {addMode === 'invite' && (
              <p className="text-xs text-text-secondary bg-surface-sunken rounded-xl p-3 break-keep leading-relaxed">
                전화번호로 SMS 초대 링크를 발송합니다. 작업자가 링크를 수락하면 앱 계정과 자동으로 연결됩니다.
              </p>
            )}

            <Input
              label="이름 *"
              placeholder="예: 홍길동"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
            />

            <Input
              label={addMode === 'invite' ? '전화번호 *' : '전화번호'}
              type="tel"
              placeholder="010-0000-0000"
              value={form.phone}
              onChange={(e) => setField('phone', formatPhone(e.target.value))}
              maxLength={13}
            />

            {addMode === 'manual' && (
              <>
                <div className="flex gap-3">
                  <Input
                    label="은행"
                    placeholder="예: 국민은행"
                    value={form.account_bank}
                    onChange={(e) => setField('account_bank', e.target.value)}
                  />
                  <Input
                    label="계좌번호"
                    placeholder="계좌번호"
                    value={form.account_number}
                    onChange={(e) => setField('account_number', e.target.value)}
                  />
                </div>
                <Input
                  label="사업자등록번호"
                  placeholder="000-00-00000"
                  value={form.registration_number}
                  onChange={(e) => setField('registration_number', e.target.value)}
                />
                <Input
                  label="상호명"
                  placeholder="예: 홍길동 청소"
                  value={form.company_name}
                  onChange={(e) => setField('company_name', e.target.value)}
                />
              </>
            )}

            {addError && (
              <p className="text-sm text-state-danger">{addError}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
