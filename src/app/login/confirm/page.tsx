import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginConfirmPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <Card className="border-gray-200 dark:border-gray-700">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-400">
              We&apos;ve sent you a magic link to sign in to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Click the link in your email to continue. If you don&apos;t see it, check your spam folder.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}