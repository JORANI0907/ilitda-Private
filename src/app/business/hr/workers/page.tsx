'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoginPrompt } from '@/components/shared/LoginPrompt'
import { WorkerCard, WorkerCardSkeleton } from '@/components/business/WorkerCard'
import type { Worker, Profile } from '@/types'

interface WorkerItem {
  worker_id: string
  last_worked: string
  worker: (Worker & {
    profile: Pick<Profile, 'name' | 'phone' | 'rating_avg' | 'rating_count'> | null
  }) | null
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<WorkerItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const fetchWorkers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/business/workers')
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '불러오기에 실패했습니다.')
        return
      }
      setWorkers(json.data ?? [])
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkers()
  }, [fetchWorkers])

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <SectionHeader
        title="인사"
        level="page"
        description="배정 이력 기준 작업자 목록"
      />

      <div className="flex flex-col gap-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <WorkerCardSkeleton key={i} />
        ))}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-state-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchWorkers}>재시도</Button>
          </div>
        )}

        {!isLoading && !error && workers.length === 0 && (
          <EmptyState
            icon={<Users size={40} />}
            title="작업자 이력이 없어요"
            description="일정에 작업자를 배정하면 여기에 표시됩니다."
            bordered
          />
        )}

        {!isLoading && !error && workers.map((w) => (
          <WorkerCard
            key={w.worker_id}
            worker={w.worker ?? { id: w.worker_id, profile_id: '', birthdate: null, account_bank: null, account_number: null, available_regions: [], certifications: [], experience: null, created_at: '', updated_at: '' }}
            lastWorked={w.last_worked}
          />
        ))}
      </div>

      <LoginPrompt
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />
    </div>
  )
}
