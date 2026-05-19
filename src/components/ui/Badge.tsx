'use client'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variantStyles = {
    default: 'bg-surface-sunken text-text-secondary',
    primary: 'bg-brand-light text-brand-700',
    success: 'bg-state-success-bg text-state-success',
    warning: 'bg-state-warning-bg text-state-warning',
    danger:  'bg-state-danger-bg text-state-danger',
    info:    'bg-state-info-bg text-state-info',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

// 일정 상태 → Badge variant 매핑
export function ScheduleStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    scheduled:   { label: '예정', variant: 'info' },
    in_progress: { label: '진행중', variant: 'primary' },
    completed:   { label: '완료', variant: 'success' },
    cancelled:   { label: '취소', variant: 'danger' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}

// 배정 상태 → Badge variant 매핑
export function AssignmentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    pending:   { label: '대기', variant: 'warning' },
    accepted:  { label: '수락', variant: 'success' },
    rejected:  { label: '거절', variant: 'danger' },
    completed: { label: '완료', variant: 'default' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}
