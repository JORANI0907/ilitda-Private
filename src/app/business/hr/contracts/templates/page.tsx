'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, FileText, Upload, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { SectionHeader } from '@/components/ui/SectionHeader'

// ─── 타입 ────────────────────────────────────────────────────────

interface TemplateRow {
  id:            string
  name:          string
  description:   string | null
  template_type: 'text' | 'upload'
  file_url:      string | null
  is_active:     boolean
  created_at:    string
}

type CreateTab = 'upload' | 'text'

// ─── 변수 삽입 버튼 목록 ─────────────────────────────────────────

const TEMPLATE_VARS = [
  { label: '[업체명]',  value: '[업체명]' },
  { label: '[고객명]',  value: '[고객명]' },
  { label: '[금액]',    value: '[금액]' },
  { label: '[시작일]',  value: '[시작일]' },
  { label: '[종료일]',  value: '[종료일]' },
]

// ─── 메인 페이지 ─────────────────────────────────────────────────

export default function TemplatesPage() {
  const router  = useRouter()

  const [templates, setTemplates]   = useState<TemplateRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [errorMsg, setErrorMsg]     = useState<string | null>(null)
  const [actionMsg, setActionMsg]   = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // 새 템플릿 모달
  const [showCreate, setShowCreate] = useState(false)
  const [createTab, setCreateTab]   = useState<CreateTab>('upload')

  // 파일 업로드 탭 상태
  const [uploadFile, setUploadFile]   = useState<File | null>(null)
  const [uploadName, setUploadName]   = useState('')
  const [uploadDesc, setUploadDesc]   = useState('')
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver]   = useState(false)

  // 직접 작성 탭 상태
  const [textName, setTextName]       = useState('')
  const [textDesc, setTextDesc]       = useState('')
  const [textBody, setTextBody]       = useState('')
  const [textCreating, setTextCreating] = useState(false)
  const [textError, setTextError]     = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [customVarInput, setCustomVarInput] = useState('')
  const [customVars, setCustomVars]         = useState<{ label: string; value: string }[]>([])

  // ── 알림 자동 소거 ─────────────────────────────────────────
  useEffect(() => {
    if (!actionMsg) return
    const t = setTimeout(() => setActionMsg(null), 3000)
    return () => clearTimeout(t)
  }, [actionMsg])

  // ── 목록 로딩 ─────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res  = await fetch('/api/admin/contract-templates')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '로딩 실패')
      setTemplates(json.templates ?? [])
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '로딩 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  // ── 모달 열기 초기화 ──────────────────────────────────────
  const handleOpenCreate = () => {
    setCreateTab('upload')
    setUploadFile(null); setUploadName(''); setUploadDesc(''); setUploadError(null)
    setTextName(''); setTextDesc(''); setTextBody(''); setTextError(null)
    setCustomVarInput(''); setCustomVars([])
    setShowCreate(true)
  }

  // ── 드래그앤드롭 ─────────────────────────────────────────
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleFileSelect = (file: File) => {
    const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
    if (!ALLOWED.includes(file.type)) {
      setUploadError('허용 형식: PDF, PNG, JPEG, WEBP')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('파일 크기는 10MB 이하여야 합니다')
      return
    }
    setUploadError(null)
    setUploadFile(file)
    if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ''))
  }

  // ── 파일 업로드 저장 ──────────────────────────────────────
  const handleUploadSave = async () => {
    if (!uploadFile)       { setUploadError('파일을 선택해 주세요'); return }
    if (!uploadName.trim()) { setUploadError('템플릿 이름을 입력해 주세요'); return }
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      fd.append('name', uploadName.trim())
      if (uploadDesc.trim()) fd.append('description', uploadDesc.trim())
      const res  = await fetch('/api/admin/contract-templates/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '업로드 실패')
      setShowCreate(false)
      setActionMsg({ text: '템플릿이 저장되었습니다', type: 'success' })
      await loadTemplates()
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : '업로드 실패')
    } finally {
      setUploading(false)
    }
  }

  // ── 직접 작성 저장 ────────────────────────────────────────
  const handleTextSave = async () => {
    if (!textName.trim()) { setTextError('템플릿 이름을 입력해 주세요'); return }
    if (!textBody.trim()) { setTextError('본문을 입력해 주세요'); return }
    setTextCreating(true)
    setTextError(null)
    try {
      const res  = await fetch('/api/admin/contract-templates', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:        textName.trim(),
          description: textDesc.trim() || undefined,
          html_body:   textBody,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '저장 실패')
      setShowCreate(false)
      setActionMsg({ text: '템플릿이 저장되었습니다', type: 'success' })
      await loadTemplates()
    } catch (e) {
      setTextError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setTextCreating(false)
    }
  }

  // ── 변수 삽입 ─────────────────────────────────────────────
  const insertVar = (varText: string) => {
    const el = textareaRef.current
    if (!el) { setTextBody(prev => prev + varText); return }
    const start = el.selectionStart
    const end   = el.selectionEnd
    setTextBody(prev => prev.slice(0, start) + varText + prev.slice(end))
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + varText.length, start + varText.length)
    }, 0)
  }

  // ── 커스텀 변수 추가 ─────────────────────────────────────
  const handleAddCustomVar = () => {
    const raw = customVarInput.trim().replace(/[[\]{}]/g, '')
    if (!raw) return
    const value = `[${raw}]`
    if (customVars.some(v => v.value === value)) {
      insertVar(value)
      setCustomVarInput('')
      return
    }
    setCustomVars(prev => [...prev, { label: value, value }])
    insertVar(value)
    setCustomVarInput('')
  }

  // ── 활성/비활성 토글 ──────────────────────────────────────
  const handleToggle = async (t: TemplateRow) => {
    try {
      const res  = await fetch(`/api/admin/contract-templates/${t.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is_active: !t.is_active }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '수정 실패')
      setTemplates(prev => prev.map(item =>
        item.id === t.id ? { ...item, is_active: !t.is_active } : item
      ))
    } catch (e) {
      setActionMsg({ text: e instanceof Error ? e.message : '수정 실패', type: 'error' })
    }
  }

  // ── 삭제 ──────────────────────────────────────────────────
  const handleDelete = async (t: TemplateRow) => {
    if (!confirm(`"${t.name}" 템플릿을 삭제하시겠습니까?`)) return
    try {
      const res  = await fetch(`/api/admin/contract-templates/${t.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '삭제 실패')
      setTemplates(prev => prev.filter(item => item.id !== t.id))
      setActionMsg({ text: '템플릿이 삭제되었습니다', type: 'success' })
    } catch (e) {
      setActionMsg({ text: e instanceof Error ? e.message : '삭제 실패', type: 'error' })
    }
  }

  // ─── 렌더링 ──────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">

      {/* 알림 */}
      {actionMsg && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl shadow-pop text-sm font-medium text-white max-w-xs w-max text-center ${actionMsg.type === 'success' ? 'bg-state-success' : 'bg-state-danger'}`}>
          {actionMsg.text}
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
        <SectionHeader title="계약 양식 관리" level="page" className="flex-1" />
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus size={14} />
          새 템플릿
        </Button>
      </div>

      {/* 에러 */}
      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-state-danger-bg border border-state-danger text-sm text-state-danger">
          {errorMsg}
        </div>
      )}

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-text-tertiary">
          로딩 중…
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
            <FileText size={28} className="text-violet-400" />
          </div>
          <p className="text-sm font-medium text-text-primary">등록된 양식이 없습니다</p>
          <p className="text-xs text-text-tertiary break-keep">새 템플릿 버튼을 눌러 양식을 추가해 보세요</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {templates.map(t => (
            <li key={t.id}>
              <div className="p-4 rounded-2xl bg-surface border border-border-subtle shadow-flat">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-text-primary break-keep">{t.name}</span>
                      <Badge variant={t.template_type === 'upload' ? 'info' : 'primary'}>
                        {t.template_type === 'upload' ? '파일업로드' : '직접작성'}
                      </Badge>
                      <Badge variant={t.is_active ? 'success' : 'default'}>
                        {t.is_active ? '활성' : '비활성'}
                      </Badge>
                    </div>
                    {t.description && (
                      <p className="text-xs text-text-secondary mt-0.5 break-keep">{t.description}</p>
                    )}
                    <p className="text-[11px] text-text-tertiary mt-1">
                      {new Date(t.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggle(t)}
                      className="p-2 rounded-lg text-text-tertiary hover:text-brand-600 hover:bg-surface-sunken transition-colors"
                      title={t.is_active ? '비활성화' : '활성화'}
                    >
                      {t.is_active
                        ? <ToggleRight size={20} className="text-brand-600" />
                        : <ToggleLeft size={20} />
                      }
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t)}
                      className="p-2 rounded-lg text-text-tertiary hover:text-state-danger hover:bg-state-danger-bg transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── 새 템플릿 모달 ────────────────────────────────────── */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="새 계약 양식"
        footer={
          createTab === 'upload' ? (
            <>
              {uploadError && <p className="text-xs text-state-danger text-center">{uploadError}</p>}
              <Button onClick={handleUploadSave} isLoading={uploading} fullWidth>
                저장
              </Button>
            </>
          ) : (
            <>
              {textError && <p className="text-xs text-state-danger text-center">{textError}</p>}
              <Button onClick={handleTextSave} isLoading={textCreating} fullWidth>
                저장
              </Button>
            </>
          )
        }
      >
        {/* 탭 */}
        <div className="flex rounded-xl bg-surface-sunken border border-border-subtle p-1 gap-1 mb-5">
          {(['upload', 'text'] as CreateTab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setCreateTab(tab)}
              className={`
                flex-1 py-2 rounded-lg text-sm font-medium transition-all
                ${createTab === tab
                  ? 'bg-surface text-text-primary shadow-flat'
                  : 'text-text-tertiary hover:text-text-secondary'}
              `}
            >
              {tab === 'upload' ? '파일 업로드' : '직접 작성'}
            </button>
          ))}
        </div>

        {/* 파일 업로드 탭 */}
        {createTab === 'upload' && (
          <div className="space-y-4">
            {/* 드래그앤드롭 영역 */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative flex flex-col items-center justify-center gap-3 p-8
                rounded-2xl border-2 border-dashed cursor-pointer transition-all
                ${isDragOver
                  ? 'border-brand-500 bg-brand-light'
                  : uploadFile
                    ? 'border-state-success bg-state-success-bg'
                    : 'border-border hover:border-brand-400 hover:bg-surface-sunken'}
              `}
            >
              <Upload size={28} className={uploadFile ? 'text-state-success' : 'text-text-tertiary'} />
              {uploadFile ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-state-success">{uploadFile.name}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-text-primary">파일을 드래그하거나 클릭하여 선택</p>
                  <p className="text-xs text-text-tertiary mt-0.5">PDF, PNG, JPEG, WEBP · 최대 10MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                className="hidden"
              />
            </div>
            <Input
              label="템플릿 이름"
              value={uploadName}
              onChange={e => setUploadName(e.target.value)}
              placeholder="계약 양식 이름"
            />
            <Input
              label="설명 (선택)"
              value={uploadDesc}
              onChange={e => setUploadDesc(e.target.value)}
              placeholder="간단한 설명"
            />
          </div>
        )}

        {/* 직접 작성 탭 */}
        {createTab === 'text' && (
          <div className="space-y-4">
            <Input
              label="템플릿 이름"
              value={textName}
              onChange={e => setTextName(e.target.value)}
              placeholder="계약 양식 이름"
            />
            <Input
              label="설명 (선택)"
              value={textDesc}
              onChange={e => setTextDesc(e.target.value)}
              placeholder="간단한 설명"
            />

            {/* 변수 삽입 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                변수 삽입
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {[...TEMPLATE_VARS, ...customVars].map(v => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => insertVar(v.value)}
                    className="px-2.5 py-1 rounded-lg border border-border bg-surface-sunken text-xs text-text-secondary hover:border-brand-400 hover:text-brand-600 transition-colors"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              {/* 커스텀 변수 추가 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customVarInput}
                  onChange={e => setCustomVarInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomVar() } }}
                  placeholder="변수명 입력 후 추가 (예: 특이사항)"
                  className="flex-1 rounded-md border border-border bg-surface text-text-primary placeholder:text-text-tertiary px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomVar}
                  className="px-3 py-1.5 rounded-md border border-brand-400 text-brand-600 text-xs font-medium hover:bg-brand-50 transition-colors"
                >
                  + 추가
                </button>
              </div>
              <p className="text-[11px] text-text-tertiary">추가하면 버튼이 생성되고 커서 위치에 즉시 삽입됩니다</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">본문</label>
              <textarea
                ref={textareaRef}
                value={textBody}
                onChange={e => setTextBody(e.target.value)}
                placeholder="계약서 본문을 입력하세요&#10;HTML 태그 사용 가능합니다"
                rows={10}
                className="block w-full rounded-md bg-surface border border-border text-text-primary placeholder:text-text-tertiary px-4 py-3 text-sm leading-normal transition-colors resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
