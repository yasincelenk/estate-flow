import { createServerClient } from '@supabase/ssr'

export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // This will be handled by the middleware
          return []
        },
        setAll(_cookiesToSet) {
          // This will be handled by the middleware
          // The `setAll` method was called from a Server Component
          // This can be ignored if you have middleware refreshing
          // user sessions
        },
      },
    }
  )
}