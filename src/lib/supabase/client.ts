import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const accessToken = typeof document !== 'undefined'
    ? document.cookie.match(/(?:^|;)\s*ilitda_access_token=([^;]+)/)?.[1]
    : undefined

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'ilitda' },
      ...(accessToken
        ? { global: { headers: { Authorization: `Bearer ${decodeURIComponent(accessToken)}` } } }
        : {}),
    }
  )
}
