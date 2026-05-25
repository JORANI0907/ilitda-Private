'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, X, FileText, ExternalLink, RefreshCw,
  ChevronLeft, ChevronRight, Save, RotateCcw, Upload, Trash2, Eye, LogIn, Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { HelpBanner } from '@/components/ui/HelpBanner'
import { HelpDrawer } from '@/components/ui/HelpDrawer'
import { HelpIcon } from '@/components/ui/HelpIcon'

// ─── 타입 ────────────────────────────────────────────────────────

interface QuoteItem { name: string; qty: number; unit_price: number; subtotal: number }
interface QuoteLogEntry { quote_no: string; pdf_url: string | null; sent_at: string; total_amount: number }

interface ApplicationRow {
  id: string
  owner_name: string
  business_name: string
  phone: string
  email: string | null
  address: string
  construction_date: string | null
  last_quote_no: string | null
  last_quote_pdf_url: string | null
  quote_items: QuoteItem[] | null
  quote_log: QuoteLogEntry[] | null
  quote_notes: string | null
  created_at: string
  status: string
  assigned_connection_ids: string[] | null
}

interface CompanyInfo {
  company_name: string; company_ceo: string; company_biz_no: string
  company_phone: string; company_address: string
}

type PricingMode = 'itemized' | 'total' | 'supply'

// ─── 상수 ────────────────────────────────────────────────────────

const EMPTY_COMPANY: CompanyInfo = {
  company_name: '', company_ceo: '', company_biz_no: '', company_phone: '', company_address: '',
}
const ITEM_NAME_MAX = 40
const PAGE_SIZE     = 20

// ─── 유틸 ────────────────────────────────────────────────────────

const fmtKr   = (n: number) => n.toLocaleString('ko-KR')
const fmtDate = (s: string) => s.slice(0, 10)

// ─── 미리보기 컴포넌트 ────────────────────────────────────────────

interface PreviewData {
  quoteNo: string
  createdAt: string
  validUntil: string
  company: CompanyInfo
  ownerName: string
  businessName: string
  phone: string
  email: string
  address: string
  constructionDate: string
  quoteItems: QuoteItem[]
  supplyAmount: number
  vatAmount: number
  totalAmount: number
  notes: string
  hideItemPrices: boolean
}

function QuotePreview({ d }: { d: PreviewData }) {
  return (
    <div className="bg-white rounded-xl border border-border-subtle p-6 space-y-5 text-sm font-sans">
      {/* 헤더 */}
      <div className="flex items-end justify-between border-b-2 border-violet-500 pb-4">
        <span className="text-2xl font-bold text-text-primary tracking-widest">견  적  서</span>
        <div className="text-right text-xs text-text-tertiary">
          <div className="font-medium text-text-secondary">{d.quoteNo}</div>
          <div>작성일 {d.createdAt}</div>
        </div>
      </div>

      {/* 고객사 / 공급자 */}
      <div className="grid grid-cols-2 gap-3">
        <InfoBox title="고  객  사" rows={[
          ['업체명', d.businessName],
          ['대표자', d.ownerName],
          ['연락처', d.phone],
          ...(d.email             ? [['이메일', d.email] as [string,string]] : []),
          ['주  소', d.address],
          ...(d.constructionDate  ? [['서비스일자', d.constructionDate] as [string,string]] : []),
        ]} />
        <InfoBox title="공  급  자" rows={[
          ['상  호', d.company.company_name],
          ['대표자', d.company.company_ceo],
          ['사업자', d.company.company_biz_no],
          ['연락처', d.company.company_phone],
          ['주  소', d.company.company_address],
        ]} />
      </div>

      {/* 메타 */}
      <div className="flex justify-between bg-surface-sunken rounded-lg px-4 py-2 text-xs text-text-secondary">
        <span>작성일 {d.createdAt}</span>
        <span>견적 유효기간 {d.validUntil}까지</span>
      </div>

      {/* 항목 테이블 */}
      {d.quoteItems.filter(i => i.name.trim()).length > 0 && (
        <div className="rounded-lg overflow-hidden border border-border-subtle">
          <table className="w-full text-xs">
            <thead className="bg-violet-600 text-white">
              <tr>
                <th className="text-left px-3 py-2">항목명</th>
                {!d.hideItemPrices && <th className="text-right px-3 py-2 w-14">수량</th>}
                {!d.hideItemPrices && <th className="text-right px-3 py-2 w-24">단가</th>}
                {!d.hideItemPrices && <th className="text-right px-3 py-2 w-24">소계</th>}
              </tr>
            </thead>
            <tbody>
              {d.quoteItems.filter(i => i.name.trim()).map((item, idx) => (
                <tr key={idx} className={`border-t border-border-subtle ${idx % 2 === 1 ? 'bg-surface-sunken' : ''}`}>
                  <td className="px-3 py-1.5">{item.name}</td>
                  {!d.hideItemPrices && <td className="px-3 py-1.5 text-right tabular-nums">{item.qty}</td>}
                  {!d.hideItemPrices && <td className="px-3 py-1.5 text-right tabular-nums">{fmtKr(item.unit_price)}</td>}
                  {!d.hideItemPrices && <td className="px-3 py-1.5 text-right tabular-nums">{fmtKr(item.subtotal)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 합계 */}
      <div className="flex justify-end">
        <div className="w-56 rounded-lg border border-border-subtle overflow-hidden">
          <div className="flex justify-between px-4 py-2 text-xs border-b border-border-subtle">
            <span className="text-text-secondary">공급가액</span>
            <span className="tabular-nums">{fmtKr(d.supplyAmount)}원</span>
          </div>
          <div className="flex justify-between px-4 py-2 text-xs border-b border-border-subtle">
            <span className="text-text-secondary">부가세 (10%)</span>
            <span className="tabular-nums">{fmtKr(d.vatAmount)}원</span>
          </div>
          <div className="flex justify-between px-4 py-2 bg-violet-50">
            <span className="text-xs font-bold tracking-widest text-text-primary">합  계</span>
            <span className="font-bold text-violet-600 tabular-nums">{fmtKr(d.totalAmount)}원</span>
          </div>
        </div>
      </div>

      {/* 특이사항 */}
      {d.notes && (
        <div className="rounded-lg border border-border-subtle bg-surface-sunken px-4 py-3">
          <div className="text-xs font-semibold text-text-secondary mb-1 tracking-wide">특이사항</div>
          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{d.notes}</p>
        </div>
      )}

      {/* 서명란 */}
      <div className="flex justify-end pt-2">
        <div className="text-right text-xs text-text-secondary">
          <div className="mb-1 text-text-tertiary">위 금액을 견적합니다.</div>
          <div>{d.company.company_name}  대표  {d.company.company_ceo}  (인)</div>
        </div>
      </div>
    </div>
  )
}

function InfoBox({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg border border-border-subtle overflow-hidden">
      <div className="bg-surface-sunken px-3 py-2 text-[10px] font-bold text-text-secondary tracking-widest border-b border-border-subtle">
        {title}
      </div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex px-3 py-1.5 text-xs border-b border-border-subtle last:border-0">
          <span className="w-14 text-text-tertiary flex-shrink-0">{label}</span>
          <span className="text-text-primary break-all">{value || '—'}</span>
        </div>
      ))}
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────────

const HELP_SECTIONS = [
  {
    title: '견적서란?',
    content: '서비스 금액과 내용을 공식 문서로 고객에게 제공하는 기능입니다. PDF 형태로 생성되어 이메일 또는 SMS 링크로 고객에게 발송됩니다. 발송 이력이 기록되어 이전 견적서도 조회할 수 있습니다.',
  },
  {
    title: '발행 순서',
    content: '1. 아래 목록에서 신청서를 탭합니다.\n2. 견적서 작성 화면이 열리면 가격 입력 방식을 선택합니다.\n3. 금액과 서비스 항목을 입력합니다.\n4. 공급자 정보(회사 정보)를 입력합니다.\n5. "미리보기"로 최종 확인 후 "견적서 발송"을 누릅니다.\n\n견적서를 발행하려면 먼저 서비스 신청서가 등록되어 있어야 합니다.',
  },
  {
    title: '가격 방식 3가지 상황별 활용법',
    content: '항목별: 서비스 항목을 하나씩 나열하고 수량·단가를 입력합니다. 고객이 항목별로 금액을 확인할 수 있어 투명한 견적에 적합합니다.\n\n합계기준: VAT 포함 최종 금액 하나만 입력합니다. 간단한 견적이나 패키지 요금제에 사용합니다.\n\n공급가기준: 공급가액과 부가세를 분리해서 입력합니다. 세금계산서 발행이 필요한 사업자 고객에게 사용합니다.',
  },
  {
    title: '발송 방법 (이메일 / SMS)',
    content: '"견적서 발송" 버튼을 누르면 PDF가 자동으로 생성됩니다.\n이메일: 고객 이메일로 PDF 파일이 첨부되어 발송됩니다.\nSMS: 고객 연락처로 견적서 링크가 문자로 발송됩니다.\n\n발송 전 반드시 "미리보기" 버튼으로 내용을 확인하세요. 한번 발송한 견적서는 수정할 수 없습니다.',
  },
]

export default function QuotationsPage() {
  const router = useRouter()
  const [helpOpen, setHelpOpen] = useState(false)
  const [isDemo, setIsDemo]     = useState(false)

  // 목록
  const [filterYM, setFilterYM] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)

  // 에디터 모달
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  // 미리보기 모달
  const [showPreview, setShowPreview] = useState(false)

  // 공급자 정보 — 저장된 버전 (페이지 모달용)
  const [companyInfo, setCompanyInfo]         = useState<CompanyInfo>(EMPTY_COMPANY)
  const [savingSettings, setSavingSettings]   = useState(false)
  const [sealImageUrl, setSealImageUrl]       = useState<string | null>(null)
  const [sealUploading, setSealUploading]     = useState(false)
  const [validDays, setValidDays]             = useState(5)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const sealInputRef = useRef<HTMLInputElement>(null)

  // 공급자 정보 — 에디터 모달 1회용 버전
  const [localCompanyInfo, setLocalCompanyInfo] = useState<CompanyInfo>(EMPTY_COMPANY)

  // 고객 정보
  const [ownerName, setOwnerName]             = useState('')
  const [businessName, setBusinessName]       = useState('')
  const [phone, setPhone]                     = useState('')
  const [email, setEmail]                     = useState('')
  const [address, setAddress]                 = useState('')
  const [constructionDate, setConstructionDate] = useState('')

  // 견적 항목
  const [quoteItems, setQuoteItems]     = useState<QuoteItem[]>([])
  const [pricingMode, setPricingMode]   = useState<PricingMode>('itemized')
  const [directAmount, setDirectAmount] = useState(0)
  const [notes, setNotes]               = useState('')

  // 작업 상태
  const [sending, setSending]         = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [toast, setToast]             = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selected    = applications.find(a => a.id === selectedId) ?? null
  const totalPages  = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // ymStr 헬퍼
  const ymStr = `${filterYM.year}-${String(filterYM.month).padStart(2, '0')}`

  // ── 토스트 ────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // ── 금액 계산 ─────────────────────────────────────────────────
  const { supplyAmount, vatAmount, totalAmount } = (() => {
    if (pricingMode === 'itemized') {
      const supply = quoteItems.reduce((s, i) => s + i.subtotal, 0)
      const vat    = Math.round(supply * 0.1)
      return { supplyAmount: supply, vatAmount: vat, totalAmount: supply + vat }
    }
    if (pricingMode === 'total') {
      const supply = Math.round(directAmount / 1.1)
      const vat    = directAmount - supply
      return { supplyAmount: supply, vatAmount: vat, totalAmount: directAmount }
    }
    const vat = Math.round(directAmount * 0.1)
    return { supplyAmount: directAmount, vatAmount: vat, totalAmount: directAmount + vat }
  })()

  // ── 공급자 정보 로딩 (회원가입 정보 기본값 fallback) ──────────
  useEffect(() => {
    const load = async () => {
      try {
        const [settingsRes, profileRes] = await Promise.all([
          fetch('/api/admin/quote-settings'),
          fetch('/api/auth/profile'),
        ])
        const [settingsData, profileData] = await Promise.all([
          settingsRes.json(),
          profileRes.json(),
        ])

        setValidDays(settingsData.valid_days ?? 5)
        setSealImageUrl(settingsData.seal_image_url ?? null)

        if (settingsData.company_name?.trim()) {
          setCompanyInfo({
            company_name:    settingsData.company_name    ?? '',
            company_ceo:     settingsData.company_ceo     ?? '',
            company_biz_no:  settingsData.company_biz_no  ?? '',
            company_phone:   settingsData.company_phone   ?? '',
            company_address: settingsData.company_address ?? '',
          })
        } else if (profileData.success && profileData.data?.business) {
          // 저장된 공급자 정보가 없으면 회원가입 정보로 초기값 설정
          const biz = profileData.data.business
          setCompanyInfo({
            company_name:    biz.business_name         ?? '',
            company_ceo:     biz.representative_name   ?? '',
            company_biz_no:  biz.registration_number   ?? '',
            company_phone:   '',
            company_address: biz.address               ?? '',
          })
        }
      } catch {
        // 로딩 실패 시 빈 값 유지
      }
    }
    load()
  }, [])

  // ── 공급자 정보 저장 ─────────────────────────────────────────
  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/admin/quote-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...companyInfo, valid_days: validDays }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '저장 실패')
      showToast('공급자 정보가 저장되었습니다.')
      setShowCompanyModal(false)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '저장 실패', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  // ── 인감 업로드 ──────────────────────────────────────────────
  const handleSealUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSealUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res  = await fetch('/api/admin/quote-settings/seal', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '업로드 실패')
      setSealImageUrl(data.seal_url)
      showToast('인감 이미지가 저장되었습니다.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '업로드 실패', 'error')
    } finally {
      setSealUploading(false)
      if (sealInputRef.current) sealInputRef.current.value = ''
    }
  }

  const handleSealDelete = async () => {
    setSealUploading(true)
    try {
      const res  = await fetch('/api/admin/quote-settings/seal', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '삭제 실패')
      setSealImageUrl(null)
      showToast('인감 이미지가 삭제되었습니다.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '삭제 실패', 'error')
    } finally {
      setSealUploading(false)
    }
  }

  // ── 목록 로딩 ─────────────────────────────────────────────────
  const loadApplications = useCallback(async (p: number, q: string, ym?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(PAGE_SIZE),
        ...(q  ? { search: q  } : {}),
        ...(ym ? { month:  ym } : {}),
      })
      const res  = await fetch(`/api/admin/quotes?${params}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      const { applications: data, total: t } = json
      setApplications((data as ApplicationRow[]) || [])
      setTotal(t ?? 0)
      setIsDemo(json.isDemo === true)
    } catch {
      showToast('목록 로딩 실패', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { loadApplications(1, '', ymStr) }, [loadApplications]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 월 이동 ───────────────────────────────────────────────────
  const prevMonth = () => {
    const next = filterYM.month === 1
      ? { year: filterYM.year - 1, month: 12 }
      : { ...filterYM, month: filterYM.month - 1 }
    const ym = `${next.year}-${String(next.month).padStart(2, '0')}`
    setFilterYM(next)
    setPage(1)
    setSearch('')
    loadApplications(1, '', ym)
  }

  const nextMonth = () => {
    const next = filterYM.month === 12
      ? { year: filterYM.year + 1, month: 1 }
      : { ...filterYM, month: filterYM.month + 1 }
    const ym = `${next.year}-${String(next.month).padStart(2, '0')}`
    setFilterYM(next)
    setPage(1)
    setSearch('')
    loadApplications(1, '', ym)
  }

  const handleMonthInputChange = (value: string) => {
    const [y, m] = value.split('-').map(Number)
    if (!y || !m) return
    const next = { year: y, month: m }
    setFilterYM(next)
    setPage(1)
    setSearch('')
    loadApplications(1, '', value)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      loadApplications(1, value, ymStr)
    }, 500)
  }

  const handlePageChange = (p: number) => { setPage(p); loadApplications(p, search, ymStr) }
  const handleRefresh    = () => loadApplications(page, search, ymStr)

  // ── 항목 선택 → 에디터 열기 ──────────────────────────────────
  const handleSelect = useCallback((app: ApplicationRow, savedCompanyInfo: CompanyInfo) => {
    setSelectedId(app.id)
    setOwnerName(app.owner_name || '')
    setBusinessName(app.business_name || '')
    setPhone(app.phone || '')
    setEmail(app.email || '')
    setAddress(app.address || '')
    setConstructionDate(app.construction_date || '')
    setQuoteItems(app.quote_items?.length ? app.quote_items.map(i => ({ ...i })) : [])
    setPricingMode('itemized')
    setDirectAmount(0)
    setNotes(app.quote_notes ?? '')
    setLocalCompanyInfo({ ...savedCompanyInfo })
    setShowEditor(true)
  }, [])

  // ── 임시 저장 ─────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!selectedId) return
    setSavingDraft(true)
    try {
      const res = await fetch(`/api/admin/quotes/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_items: quoteItems, quote_notes: notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '저장 실패')
      setApplications(prev => prev.map(a =>
        a.id === selectedId ? { ...a, quote_items: quoteItems, quote_notes: notes } : a
      ))
      showToast('저장되었습니다.')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '저장 실패', 'error')
    } finally {
      setSavingDraft(false)
    }
  }

  // ── 견적 항목 편집 ────────────────────────────────────────────
  const addItem    = () => setQuoteItems(p => [...p, { name: '', qty: 1, unit_price: 0, subtotal: 0 }])
  const removeItem = (i: number) => setQuoteItems(p => p.filter((_, idx) => idx !== i))
  const updateItem = (idx: number, field: keyof QuoteItem, value: string | number) => {
    setQuoteItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'qty' || field === 'unit_price') {
        updated.subtotal = (field === 'qty' ? Number(value) : item.qty)
                         * (field === 'unit_price' ? Number(value) : item.unit_price)
      }
      return updated
    }))
  }

  // ── 유효성 검사 ──────────────────────────────────────────────
  const validate = (): string | null => {
    if (!selected)               return '신청서를 선택해 주세요.'
    if (!ownerName?.trim())      return '고객명이 없습니다.'
    if (!phone?.trim())          return '연락처가 없습니다.'
    if (!address?.trim())        return '주소가 없습니다.'
    if (pricingMode === 'itemized') {
      if (quoteItems.length === 0)              return '견적 항목을 1개 이상 추가해 주세요.'
      if (quoteItems.some(i => !i.name.trim())) return '항목명이 비어있는 항목이 있습니다.'
    } else {
      if (directAmount <= 0) return '금액을 입력해 주세요.'
    }
    if (!localCompanyInfo.company_name?.trim()) return '공급자 상호가 없습니다. 공급자 정보를 먼저 입력해 주세요.'
    return null
  }

  // ── 미리보기 데이터 생성 ──────────────────────────────────────
  const buildPreviewData = (): PreviewData => {
    const todayStr   = new Date().toISOString().slice(0, 10)
    const validDate  = new Date()
    validDate.setDate(validDate.getDate() + validDays)
    const validUntil = validDate.toISOString().slice(0, 10)
    return {
      quoteNo:          `ILT-XXXX-${todayStr.replace(/-/g, '')}`,
      createdAt:        todayStr,
      validUntil,
      company:          localCompanyInfo,
      ownerName,
      businessName,
      phone,
      email,
      address,
      constructionDate,
      quoteItems,
      supplyAmount,
      vatAmount,
      totalAmount,
      notes,
      hideItemPrices: pricingMode !== 'itemized',
    }
  }

  // ── 견적서 발송 ───────────────────────────────────────────────
  const handleSend = async () => {
    const err = validate()
    if (err) { showToast(err, 'error'); return }
    if (!selected) return

    setSending(true)
    try {
      const res = await fetch(`/api/admin/quotes/${selected.id}/send`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...localCompanyInfo,
          owner_name:        ownerName,
          business_name:     businessName,
          phone,
          email,
          address,
          construction_date: constructionDate,
          quote_items:       quoteItems,
          supply_amount:     supplyAmount,
          vat:               vatAmount,
          total_amount:      totalAmount,
          valid_days:        validDays,
          notes:             notes || undefined,
          hide_item_prices:  pricingMode !== 'itemized',
          seal_image_url:    sealImageUrl ?? undefined,
        }),
      })
      const result = await res.json()
      if (result.success) {
        showToast(`견적서 발송 완료 (${result.quote_no})`)
        setShowEditor(false)
        await loadApplications(page, search, ymStr)
      } else {
        const msg = result.errors
          ? Object.values(result.errors as Record<string, string>).join(', ')
          : '발송 실패'
        showToast(`발송 오류: ${msg}`, 'error')
        await loadApplications(page, search, ymStr)
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : '오류가 발생했습니다.', 'error')
    } finally {
      setSending(false)
    }
  }

  // ─── 렌더링 ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">

      {/* 토스트 */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl shadow-pop text-sm font-medium text-white max-w-xs w-max text-center transition-opacity ${toast.type === 'success' ? 'bg-state-success' : 'bg-state-danger'}`}>
          {toast.msg}
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 -ml-1 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <SectionHeader title="견적서 관리" level="page" className="flex-1" />
        <button
          type="button"
          onClick={() => setShowCompanyModal(true)}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-sunken"
        >
          <Settings size={13} />
          공급자 정보
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors disabled:opacity-40"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 월 필터 */}
      <div className="flex items-center justify-center gap-2 bg-surface-sunken rounded-2xl py-2.5">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <label className="relative cursor-pointer select-none">
          <span className="text-sm font-semibold text-text-primary px-3">
            {filterYM.year}년 {filterYM.month}월
          </span>
          <input
            type="month"
            value={ymStr}
            onChange={e => handleMonthInputChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
          />
        </label>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

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

      <HelpBanner label="견적서 발행 사용법 보기" onClick={() => setHelpOpen(true)} />
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="견적서 발행 사용법"
        sections={HELP_SECTIONS}
      />

      {/* 검색 */}
      <Input
        placeholder="고객명·업체명·연락처 검색"
        value={search}
        size="sm"
        onChange={e => handleSearchChange(e.target.value)}
      />

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-text-tertiary">로딩 중…</div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
            <FileText size={28} className="text-violet-400" />
          </div>
          <p className="text-sm font-medium text-text-primary">
            {search ? '검색 결과가 없습니다' : `${filterYM.month}월 견적서가 없습니다`}
          </p>
          <p className="text-xs text-text-tertiary break-keep">
            {search ? '다른 검색어로 시도해 보세요' : '신청서를 선택하여 견적서를 작성해 보세요'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium text-text-primary">총 {total}건</p>
            <p className="text-xs text-text-tertiary break-keep">아래 목록에서 신청서를 탭하면 견적서 작성 화면이 열립니다</p>
          </div>
          <ul className="flex flex-col gap-2">
            {applications.map(app => {
              const isSent = !!app.last_quote_no
              return (
                <li key={app.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(app, companyInfo)}
                    className="w-full text-left p-4 rounded-2xl bg-surface border border-border-subtle shadow-flat hover:border-border active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-text-primary truncate">{app.owner_name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${isSent ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {isSent ? '발송완료' : '미발송'}
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary">{app.business_name || '—'}</div>
                    <div className="text-xs text-text-tertiary mt-0.5">
                      {app.phone} · {fmtDate(app.created_at)}
                      {isSent && <span className="ml-2 text-green-600">{app.last_quote_no}</span>}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-2">
              <button type="button" onClick={() => handlePageChange(page - 1)} disabled={page <= 1 || loading}
                className="p-2 rounded-lg hover:bg-surface-sunken disabled:opacity-30 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-text-secondary tabular-nums">{page} / {totalPages}</span>
              <button type="button" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages || loading}
                className="p-2 rounded-lg hover:bg-surface-sunken disabled:opacity-30 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── 견적 에디터 모달 ──────────────────────────────────── */}
      <Modal
        open={showEditor}
        onClose={() => setShowEditor(false)}
        title={`견적서 작성 — ${selected?.owner_name ?? ''}`}
        className="max-w-2xl"
      >
        {selected && (
          <div className="space-y-5">

            {/* 공급자 정보 (1회성 편집 — 저장 없음) */}
            <EditorSection title="공급자 정보">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-text-tertiary">이번 발송에만 적용됩니다. 영구 저장은 페이지의 공급자 정보 버튼을 이용하세요.</p>
                <button type="button" onClick={() => setLocalCompanyInfo({ ...companyInfo })} title="저장된 정보로 초기화"
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-surface-sunken transition-colors flex-shrink-0">
                  <RotateCcw size={13} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="상호" size="sm" value={localCompanyInfo.company_name}
                  onChange={e => setLocalCompanyInfo(p => ({ ...p, company_name: e.target.value }))} />
                <Input label="대표자" size="sm" value={localCompanyInfo.company_ceo}
                  onChange={e => setLocalCompanyInfo(p => ({ ...p, company_ceo: e.target.value }))} />
                <Input label="사업자번호" size="sm" value={localCompanyInfo.company_biz_no}
                  onChange={e => setLocalCompanyInfo(p => ({ ...p, company_biz_no: e.target.value }))} />
                <Input label="연락처" size="sm" value={localCompanyInfo.company_phone}
                  onChange={e => setLocalCompanyInfo(p => ({ ...p, company_phone: e.target.value }))} />
                <div className="col-span-2">
                  <Input label="주소" size="sm" value={localCompanyInfo.company_address}
                    onChange={e => setLocalCompanyInfo(p => ({ ...p, company_address: e.target.value }))} />
                </div>
              </div>
            </EditorSection>

            {/* 고객 정보 */}
            <EditorSection title="고객 정보">
              <div className="grid grid-cols-2 gap-3">
                <Input label="대표자" size="sm" value={ownerName}
                  onChange={e => setOwnerName(e.target.value)} />
                <Input label="업체명" size="sm" value={businessName}
                  onChange={e => setBusinessName(e.target.value)} />
                <Input label="연락처" size="sm" value={phone}
                  onChange={e => setPhone(e.target.value)} />
                <Input label="이메일" size="sm" value={email}
                  onChange={e => setEmail(e.target.value)} />
                <Input label="서비스일자" size="sm" type="date" value={constructionDate}
                  onChange={e => setConstructionDate(e.target.value)} />
                <div className="col-span-2">
                  <Input label="주소" size="sm" value={address}
                    onChange={e => setAddress(e.target.value)} />
                </div>
              </div>
            </EditorSection>

            {/* 견적 항목 */}
            <EditorSection title="견적 항목">
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="flex rounded-lg bg-surface-sunken border border-border-subtle p-0.5 gap-0.5">
                    {(['itemized', 'total', 'supply'] as PricingMode[]).map(m => (
                      <button key={m} type="button"
                        onClick={() => { setPricingMode(m); setDirectAmount(0) }}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          pricingMode === m
                            ? 'bg-surface text-text-primary shadow-flat'
                            : 'text-text-tertiary hover:text-text-secondary'
                        }`}>
                        {m === 'itemized' ? '항목별' : m === 'total' ? '합계기준' : '공급가기준'}
                      </button>
                    ))}
                  </div>
                  <HelpIcon
                    title="가격 입력 방식"
                    description={'항목별: 서비스 항목을 하나씩 나열하고 각각 가격을 입력합니다. 고객이 항목별로 금액을 확인할 수 있습니다.\n\n합계기준: VAT 포함 총 금액 하나만 입력합니다. 간단한 견적에 사용합니다.\n\n공급가기준: 공급가액과 부가세를 분리해서 입력합니다. 세금계산서 발행이 필요한 사업자 고객에게 사용합니다.'}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={handleSaveDraft} disabled={savingDraft}
                    className="flex items-center gap-1.5 text-xs">
                    <Save size={12} />{savingDraft ? '저장 중…' : '저장'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={addItem} className="flex items-center gap-1 text-xs">
                    <Plus size={12} />항목 추가
                  </Button>
                </div>
              </div>

              {pricingMode !== 'itemized' && (
                <div className="mb-4 p-4 rounded-xl bg-surface-sunken border border-border-subtle">
                  <label className="block text-xs font-medium text-text-secondary mb-2">
                    {pricingMode === 'total' ? '합계금액 (VAT 포함)' : '공급가액 (VAT 제외)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input type="number" size="sm" value={directAmount || ''} min={0}
                      onChange={e => setDirectAmount(Number(e.target.value))} placeholder="0" />
                    <span className="text-sm text-text-tertiary flex-shrink-0">원</span>
                  </div>
                  {directAmount > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 rounded-lg bg-surface border border-border-subtle">
                        <div className="text-text-tertiary mb-0.5">공급가액</div>
                        <div className="font-semibold tabular-nums">{fmtKr(supplyAmount)}</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-surface border border-border-subtle">
                        <div className="text-text-tertiary mb-0.5">부가세</div>
                        <div className="font-semibold tabular-nums">{fmtKr(vatAmount)}</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-violet-50 border border-violet-200">
                        <div className="text-violet-600 mb-0.5">합계</div>
                        <div className="font-bold text-violet-600 tabular-nums">{fmtKr(totalAmount)}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {quoteItems.length === 0 ? (
                <div className="py-8 text-center text-sm text-text-tertiary border border-dashed border-border-subtle rounded-xl">
                  {pricingMode === 'itemized' ? '항목 추가 버튼을 눌러 견적 항목을 입력하세요.' : '설명 항목을 추가할 수 있습니다. (선택사항)'}
                </div>
              ) : (
                <div className="rounded-xl border border-border-subtle overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-surface-sunken border-b border-border-subtle">
                      <tr>
                        <th className="text-left px-3 py-2 text-text-secondary font-medium">항목명</th>
                        {pricingMode === 'itemized' && <>
                          <th className="text-right px-2 py-2 text-text-secondary font-medium w-16">수량</th>
                          <th className="text-right px-2 py-2 text-text-secondary font-medium w-24">단가</th>
                          <th className="text-right px-3 py-2 text-text-secondary font-medium w-22">소계</th>
                        </>}
                        <th className="py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {quoteItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface-sunken">
                          <td className="px-3 py-1.5">
                            <div className="relative">
                              <input
                                value={item.name}
                                onChange={e => updateItem(idx, 'name', e.target.value.slice(0, ITEM_NAME_MAX))}
                                placeholder="항목명"
                                className="w-full h-8 text-xs px-2 rounded-md border border-border bg-surface focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400"
                              />
                              {item.name.length >= ITEM_NAME_MAX - 8 && (
                                <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[9px] tabular-nums pointer-events-none ${item.name.length >= ITEM_NAME_MAX ? 'text-state-danger' : 'text-text-tertiary'}`}>
                                  {item.name.length}/{ITEM_NAME_MAX}
                                </span>
                              )}
                            </div>
                          </td>
                          {pricingMode === 'itemized' && <>
                            <td className="px-2 py-1.5">
                              <input type="number" value={item.qty} min={1}
                                onChange={e => updateItem(idx, 'qty', Number(e.target.value))}
                                className="w-full h-8 text-xs px-2 rounded-md border border-border bg-surface text-right focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={item.unit_price} min={0}
                                onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                                className="w-full h-8 text-xs px-2 rounded-md border border-border bg-surface text-right focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400" />
                            </td>
                            <td className="px-3 py-1.5 text-right font-medium text-text-primary tabular-nums">
                              {fmtKr(item.subtotal)}
                            </td>
                          </>}
                          <td className="pr-1.5 py-1.5 text-center">
                            <button type="button" onClick={() => removeItem(idx)}
                              className="p-1 rounded text-text-tertiary hover:text-state-danger hover:bg-state-danger-bg transition-colors">
                              <X size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </EditorSection>

            {/* 견적 조건 */}
            <EditorSection title="견적 조건">
              <div className="flex items-center gap-3 mb-3">
                <label className="text-xs text-text-secondary whitespace-nowrap">유효기간</label>
                <Input type="number" size="sm" value={validDays} min={1} max={365}
                  onChange={e => setValidDays(Math.max(1, Math.min(365, Number(e.target.value))))}
                  className="w-20" />
                <span className="text-xs text-text-secondary flex-shrink-0">일 후 만료</span>
              </div>
              <Textarea
                label="특이사항 (선택 — PDF에 포함)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="견적서에 포함할 안내사항을 입력하세요."
                rows={3}
              />
            </EditorSection>

            {/* 금액 요약 */}
            <div className="bg-violet-50 rounded-2xl border border-violet-200 p-5">
              <div className="space-y-2 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">공급가액</span>
                  <span className="tabular-nums font-medium">{fmtKr(supplyAmount)}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">부가세 (10%)</span>
                  <span className="tabular-nums text-text-secondary">{fmtKr(vatAmount)}원</span>
                </div>
                <div className="h-px bg-violet-200 my-1" />
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-text-primary">합  계</span>
                  <span className="text-2xl font-bold text-violet-600 tabular-nums">{fmtKr(totalAmount)}원</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => { const err = validate(); if (err) { showToast(err, 'error'); return } setShowPreview(true) }}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Eye size={16} />미리보기
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sending || totalAmount === 0}
                  className="flex-1"
                >
                  {sending ? '발송 중…' : '견적서 발송'}
                </Button>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <p className="text-[11px] text-text-tertiary text-center">
                  PDF 생성 → 이메일 · SMS 발송
                </p>
                <HelpIcon
                  title="발송 방법"
                  description={'이메일로 발송 시 PDF 파일이 첨부되어 고객 이메일로 전달됩니다.\n\nSMS 발송 시 견적서 링크가 고객 연락처로 문자 발송됩니다.\n\n발송 전 "미리보기"로 내용을 꼭 확인하세요. 발송 후에는 수정이 불가합니다.'}
                />
              </div>
            </div>

            {/* 발송 이력 */}
            {selected.quote_log && selected.quote_log.length > 0 && (
              <EditorSection title={`발송 이력 (${selected.quote_log.length}건)`}>
                <ul className="divide-y divide-border-subtle -mx-4 px-4">
                  {[...selected.quote_log].reverse().map((log, idx) => (
                    <li key={log.quote_no} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {idx === 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium flex-shrink-0">최신</span>
                          )}
                          <span className="text-sm font-medium text-text-primary tabular-nums truncate">{log.quote_no}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-tertiary">
                          <span>{new Date(log.sent_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                          {log.total_amount > 0 && <><span>·</span><span className="tabular-nums">{fmtKr(log.total_amount)}원</span></>}
                        </div>
                      </div>
                      {log.pdf_url && (
                        <a href={log.pdf_url} target="_blank" rel="noopener noreferrer"
                          className="flex-shrink-0 flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium">
                          <ExternalLink size={12} />PDF
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </EditorSection>
            )}
          </div>
        )}
      </Modal>

      {/* ── 공급자 정보 관리 모달 ────────────────────────────────── */}
      <Modal
        open={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        title="공급자 정보 설정"
        className="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-tertiary">저장하면 이후 모든 견적서 작성 시 자동으로 불러옵니다.</p>

          <div className="grid grid-cols-2 gap-3">
            <Input label="상호" size="sm" value={companyInfo.company_name}
              onChange={e => setCompanyInfo(p => ({ ...p, company_name: e.target.value }))} />
            <Input label="대표자" size="sm" value={companyInfo.company_ceo}
              onChange={e => setCompanyInfo(p => ({ ...p, company_ceo: e.target.value }))} />
            <Input label="사업자번호" size="sm" value={companyInfo.company_biz_no}
              onChange={e => setCompanyInfo(p => ({ ...p, company_biz_no: e.target.value }))} />
            <Input label="연락처" size="sm" value={companyInfo.company_phone}
              onChange={e => setCompanyInfo(p => ({ ...p, company_phone: e.target.value }))} />
            <div className="col-span-2">
              <Input label="주소" size="sm" value={companyInfo.company_address}
                onChange={e => setCompanyInfo(p => ({ ...p, company_address: e.target.value }))} />
            </div>
          </div>

          {/* 인감 */}
          <div className="pt-3 border-t border-border-subtle">
            <label className="block text-xs font-medium text-text-secondary mb-2">인감 이미지 (PDF에 포함)</label>
            <div className="flex items-center gap-3">
              {sealImageUrl ? (
                <>
                  <div className="w-14 h-14 rounded-xl border border-border-subtle overflow-hidden flex-shrink-0 bg-surface-sunken flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${sealImageUrl}?v=${Date.now()}`} alt="인감" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => sealInputRef.current?.click()} disabled={sealUploading}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium disabled:opacity-40">변경</button>
                    <button type="button" onClick={handleSealDelete} disabled={sealUploading}
                      className="text-xs text-state-danger hover:opacity-80 font-medium disabled:opacity-40 flex items-center gap-1">
                      <Trash2 size={11} />삭제
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" onClick={() => sealInputRef.current?.click()} disabled={sealUploading}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-xs text-text-secondary hover:border-violet-400 hover:text-violet-600 transition-colors disabled:opacity-40">
                  <Upload size={13} />{sealUploading ? '업로드 중…' : 'PNG / JPG 업로드'}
                </button>
              )}
              <input ref={sealInputRef} type="file" accept="image/png,image/jpeg,image/webp"
                onChange={handleSealUpload} className="hidden" />
            </div>
            <p className="text-[10px] text-text-tertiary mt-1.5">투명 배경 PNG 권장 · 최대 2MB</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setShowCompanyModal(false)}>닫기</Button>
            <Button fullWidth onClick={handleSaveSettings} isLoading={savingSettings}>
              저장
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── 미리보기 모달 ─────────────────────────────────────── */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="견적서 미리보기"
        className="max-w-2xl"
      >
        {selected && <QuotePreview d={buildPreviewData()} />}
        <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
          ※ 미리보기는 실제 PDF와 레이아웃이 다를 수 있습니다. 실제 발송 시 PDF가 생성됩니다.
        </div>
      </Modal>
    </div>
  )
}

// ─── 헬퍼 컴포넌트 ───────────────────────────────────────────────

function EditorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="block w-[3px] h-[14px] rounded-full bg-violet-500 flex-shrink-0" />
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      {children}
    </div>
  )
}
