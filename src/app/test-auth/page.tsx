import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export default async function TestAuthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Authentication Test
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          You are logged in as: {user.email}
        </p>
      </div>
    </div>
  )
}