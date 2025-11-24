import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/results'
  const siteUrl = 'https://estate-flow-ai.vercel.app'

  console.log('Auth Code received:', code)

  if (code) {
    const cookieStore = await (cookies() as any)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return (cookieStore as any).get(name)?.value
          },
          set(name: string, value: string, options: any) {
            (cookieStore as any).set(name, value, options)
          },
          remove(name: string, options: any) {
            (cookieStore as any).set(name, '', options)
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${siteUrl}${next}`)
    } else {
      console.log('Exchange Error:', error)
    }
  }

  return NextResponse.redirect(`${siteUrl}/login?error=auth`)
}
