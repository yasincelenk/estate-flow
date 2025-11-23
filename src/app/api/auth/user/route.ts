import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 500 })
  }
}