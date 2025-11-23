'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { getAuthRedirectURL } from "@/utils/get-url"

export async function login(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  
  if (!email) {
    throw new Error('Email is required')
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getAuthRedirectURL('/auth/callback'),
    },
  })

  if (error) {
    throw new Error(`Failed to send magic link: ${error.message}`)
  }

  // Redirect to a confirmation page
  redirect('/login/confirm')
}