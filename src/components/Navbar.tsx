'use client'

import { Button } from "@/components/ui/button"
import { Home, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<null | { email: string; id: string }>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/user')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (response.ok) {
        setUser(null)
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2 text-gray-900 hover:text-black transition-colors">
              <Home className="w-5 h-5" />
              <h1 className="text-2xl font-bold relative" style={{ fontFamily: 'var(--font-playfair)' }}>
                EstateFlow
                <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"></div>
              </h1>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" disabled className="text-gray-400">
              Loading...
            </Button>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2 text-gray-900 hover:text-black transition-colors">
            <Home className="w-5 h-5" />
            <h1 className="text-2xl font-bold relative" style={{ fontFamily: 'var(--font-playfair)' }}>
              EstateFlow
              <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"></div>
            </h1>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-900">
              Home
            </Button>
          </Link>
          {user && (
            <>
              <Link href="/create">
                <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-900">
                  Create Listing
                </Button>
              </Link>
              <Link href="/test-auth">
                <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-900">
                  Test Auth
                </Button>
              </Link>
            </>
          )}
          {user ? (
            <Button 
              onClick={handleLogout}
              variant="ghost" 
              size="sm" 
              className="text-gray-700 hover:text-gray-900 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-900">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}