import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { getFullURL, getResultsRedirectURL } from "@/utils/get-url"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/results'

  if (code) {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(getFullURL(next))
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(getFullURL('/auth/auth-code-error'))
}