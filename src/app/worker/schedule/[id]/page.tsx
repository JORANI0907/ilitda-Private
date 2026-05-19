'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Calendar, Clock, MapPin, FileText,
  Phone, Navigation,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { AssignmentStatusBadge } from '@/components/ui/Badge'
import { CheckInButton } from '@/components/worker/CheckInButton'

interface AttendanceData {
  id: string
  checkin_at: string | null
  checkout_at: string | null
  total_minutes: number | null
}

interface AssignmentDetail {
  id: string
  status: string
  hourly_rate: number | null
  schedule: {
    id: string
    service_date: string
    start_time: string
    end_time: string | null
    notes: string | null
    client: {
      name: string
      address: string | null
      phone: string | null
    } | null
  } | null
  attendance: AttendanceData | AttendanceData[] | null
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getFullYear()}년 ${month}월 ${day}일 (${weekdays[d.getDay()]})`
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const minute = m ?? '00'
  const ampm = hour < 12 ? '오전' : '오후'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${ampm} ${displayHour}:${minute}`
}

function getKakaoMapUrl(address: string): string {
  return `kakaomap://search?q=${encodeURIComponent(address)}`
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function WorkerScheduleDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [detail, setDetail] = useState<AssignmentDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchDetail = async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/worker/schedules/${id}`)
      const json = await res.json()
      if (!json.success) {
        setErrorMsg(json.error ?? '일정을 불러올 수 없습니다.')
        return
      }
      setDetail(json.data)
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const getAttendance = (): AttendanceData | null => {
    if (!detail?.attendance) return null
    if (Array.isArray(detail.attendance)) return detail.attendance[0] ?? null
    return detail.attendance
  }

  const attendance = getAttendance()
  const isToday = (): boolean => {
    if (!detail?.schedule?.service_date) return false
    const today = new Date().toISOString().slice(0, 10)
    return detail.schedule.service_date === today
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6">
        <div className="h-8 w-24 rounded-lg bg-surface-sunken animate-pulse" />
        <div className="h-40 rounded-2xl bg-surface-sunken animate-pulse" />
        <div className="h-32 rounded-2xl bg-surface-sunken animate-pulse" />
      </div>
    )
  }

  if (errorMsg || !detail) {
    return (
      <div className="px-4 pt-6 flex flex-col gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-text-secondary"
        >
          <ArrowLeft size={18} />
          뒤로
        </button>
        <p className="text-sm text-state-danger">{errorMsg ?? '일정을 찾을 수 없습니다.'}</p>
      </div>
    )
  }

  const schedule = detail.schedule

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-border-subtle text-text-secondary"
          aria-label="뒤로가기"
        >
          <ArrowLeft size={18} />
        </button>
        <SectionHeader title="일정 상세" level="page" className="flex-1" />
        <AssignmentStatusBadge status={detail.status} />
      </div>

      {/* 작업 정보 */}
      <Card padding="md">
        <p className="text-lg font-bold text-text-primary mb-4">
          {schedule?.client?.name ?? '고객 정보 없음'}
        </p>

        <div className="flex flex-col gap-3 text-sm">
          {schedule?.service_date && (
            <div className="flex items-start gap-3">
              <Calendar size={16} className="text-text-tertiary shrink-0 mt-0.5" />
              <div>
                <p className="text-text-secondary text-xs mb-0.5">날짜</p>
                <p className="text-text-primary font-medium">{formatDate(schedule.service_date)}</p>
              </div>
            </div>
          )}

          {schedule?.start_time && (
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-text-tertiary shrink-0 mt-0.5" />
              <div>
                <p className="text-text-secondary text-xs mb-0.5">시간</p>
                <p className="text-text-primary font-medium">
                  {formatTime(schedule.start_time)}
                  {schedule.end_time && ` ~ ${formatTime(schedule.end_time)}`}
                </p>
              </div>
            </div>
          )}

          {schedule?.client?.address && (
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-text-tertiary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-text-secondary text-xs mb-0.5">주소</p>
                <p className="text-text-primary font-medium break-keep">{schedule.client.address}</p>
              </div>
            </div>
          )}

          {schedule?.client?.phone && (
            <div className="flex items-start gap-3">
              <Phone size={16} className="text-text-tertiary shrink-0 mt-0.5" />
              <div>
                <p className="text-text-secondary text-xs mb-0.5">연락처</p>
                <a
                  href={`tel:${schedule.client.phone}`}
                  className="text-brand-600 font-medium"
                >
                  {schedule.client.phone}
                </a>
              </div>
            </div>
          )}

          {schedule?.notes && (
            <div className="flex items-start gap-3">
              <FileText size={16} className="text-text-tertiary shrink-0 mt-0.5" />
              <div>
                <p className="text-text-secondary text-xs mb-0.5">메모</p>
                <p className="text-text-primary leading-normal break-keep">{schedule.notes}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 지도 버튼 */}
      {schedule?.client?.address && (
        <a
          href={getKakaoMapUrl(schedule.client.address)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="secondary" fullWidth>
            <Navigation size={16} />
            카카오맵으로 길찾기
          </Button>
        </a>
      )}

      {/* 출퇴근 상태 */}
      {attendance && (
        <Card padding="md">
          <p className="text-sm font-semibold text-text-primary mb-3">출퇴근 기록</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-xl bg-surface-sunken">
              <p className="text-xs text-text-tertiary mb-1">출근 시간</p>
              <p className="text-sm font-bold text-text-primary">
                {attendance.checkin_at
                  ? new Date(attendance.checkin_at).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-surface-sunken">
              <p className="text-xs text-text-tertiary mb-1">퇴근 시간</p>
              <p className="text-sm font-bold text-text-primary">
                {attendance.checkout_at
                  ? new Date(attendance.checkout_at).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </p>
            </div>
          </div>
          {attendance.total_minutes && (
            <div className="mt-3 pt-3 border-t border-border-subtle text-center">
              <p className="text-xs text-text-tertiary">총 근무시간</p>
              <p className="font-bold text-text-primary">
                {Math.floor(attendance.total_minutes / 60)}시간{' '}
                {attendance.total_minutes % 60}분
              </p>
            </div>
          )}
        </Card>
      )}

      {/* 체크인/체크아웃 버튼 — 당일만 표시 */}
      {isToday() && (
        <div className="mt-2">
          <CheckInButton
            assignmentId={detail.id}
            hasCheckedIn={!!attendance?.checkin_at}
            hasCheckedOut={!!attendance?.checkout_at}
            onSuccess={() => fetchDetail()}
          />
        </div>
      )}

      {/* 시급 정보 */}
      {detail.hourly_rate && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-text-tertiary">예상 시급</span>
          <span className="font-bold text-brand-600">
            {detail.hourly_rate.toLocaleString()}원 / 시간
          </span>
        </div>
      )}

      <div className="h-4" />
    </div>
  )
}
