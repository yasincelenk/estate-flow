import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!url || !key) {
    console.warn('Supabase keys missing!')
  }
  const cookieStore = await (cookies() as any)
  return createServerClient(
    url,
    key,
    {
      cookies: {
        get(name: string) {
          return (cookieStore as any).get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            (cookieStore as any).set(name, value, options)
          } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            (cookieStore as any).set(name, '', options)
          } catch {}
        },
      },
    }
  )
}
