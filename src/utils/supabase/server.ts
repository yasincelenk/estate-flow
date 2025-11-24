import { createServerClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!url || !key) {
    console.warn('Supabase keys missing!')
  }
  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll(_cookiesToSet) {
        },
      },
    }
  )
}
