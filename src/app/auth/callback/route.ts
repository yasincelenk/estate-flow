import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getFullURL } from "@/utils/get-url"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/results'
  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

  if (!code) {
    return NextResponse.redirect(getFullURL('/auth/auth-code-error'))
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  let cookiesToSet: { name: string; value: string; options: any }[] = []

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(c) {
        cookiesToSet = c
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Auth code exchange failed:', error.message)
    return NextResponse.redirect(new URL('/auth/auth-code-error', origin))
  }

  const redirectResponse = NextResponse.redirect(new URL(next, origin))
  cookiesToSet.forEach(({ name, value, options }) => {
    redirectResponse.cookies.set(name, value, options)
  })
  return redirectResponse
}
