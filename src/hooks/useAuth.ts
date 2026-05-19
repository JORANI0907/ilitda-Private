'use client'

import { useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Business, Worker, ActiveRole } from '@/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  business: Business | null
  worker: Worker | null
  isLoading: boolean
}

interface UseAuthReturn extends AuthState {
  signOut: () => Promise<void>
  switchRole: (role: ActiveRole) => Promise<void>
}

async function fetchProfileData(userId: string): Promise<{
  profile: Profile | null
  business: Business | null
  worker: Worker | null
}> {
  const res = await fetch('/api/auth/profile', { cache: 'no-store' })
  if (!res.ok) {
    return { profile: null, business: null, worker: null }
  }
  const json = await res.json()
  return {
    profile: json.data?.profile ?? null,
    business: json.data?.business ?? null,
    worker: json.data?.worker ?? null,
  }
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    business: null,
    worker: null,
    isLoading: true,
  })

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setState({
          user: null,
          profile: null,
          business: null,
          worker: null,
          isLoading: false,
        })
        return
      }
      const { profile, business, worker } = await fetchProfileData(session.user.id)
      setState({
        user: session.user,
        profile,
        business,
        worker,
        isLoading: false,
      })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          setState({
            user: null,
            profile: null,
            business: null,
            worker: null,
            isLoading: false,
          })
          return
        }
        const { profile, business, worker } = await fetchProfileData(session.user.id)
        setState({
          user: session.user,
          profile,
          business,
          worker,
          isLoading: false,
        })
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setState({
      user: null,
      profile: null,
      business: null,
      worker: null,
      isLoading: false,
    })
  }, [])

  const switchRole = useCallback(async (role: ActiveRole) => {
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active_role: role }),
    })
    if (!res.ok) return
    setState(prev => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, active_role: role } : null,
    }))
  }, [])

  return { ...state, signOut, switchRole }
}
