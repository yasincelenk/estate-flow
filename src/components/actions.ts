'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export async function logout() {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw new Error(`Failed to logout: ${error.message}`)
  }
  
  redirect('/')
}