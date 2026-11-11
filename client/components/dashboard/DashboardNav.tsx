'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

interface Profile {
  name: string | null
  username: string | null
  role: number | null
}

interface DashboardNavProps {
  user: User
  profile: Profile | null
}

export default function DashboardNav({ user, profile }: DashboardNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const isAdmin = profile?.role === 0
  const roleName = isAdmin ? 'Admin' : 'Student'
  const displayName = profile?.name ?? profile?.username ?? user.email?.split('@')[0] ?? 'User'
  const initial = displayName.charAt(0).toUpperCase()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-40 bg-gradient-to-r from-emerald-900 via-green-800 to-teal-900 text-white shadow-md backdrop-blur-md border-b border-emerald-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center font-black text-emerald-200 border border-white/20 shadow-inner text-base group-hover:scale-105 transition">
              ∑
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                Mathagogy
              </span>
              <span className="text-[10px] text-emerald-200 font-medium tracking-wider uppercase hidden sm:inline">
                Junior High Diagnostic Platform
              </span>
            </div>
          </Link>
        </div>

        {/* Center / Navigation Links for Admin */}
        {isAdmin && (
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl backdrop-blur-md border border-white/15">
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                pathname === '/dashboard'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <span>🎓</span>
              <span className="hidden sm:inline">Student View</span>
            </Link>
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                pathname.startsWith('/admin')
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <span>👑</span>
              <span>Admin Results</span>
            </Link>
          </div>
        )}

        {/* User info + logout */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md pl-1.5 pr-2.5 sm:pr-3 py-1 rounded-full border border-white/15">
            <div
              className={`w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-sm ${
                isAdmin ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            >
              {initial}
            </div>
            <div className="text-left hidden xs:block">
              <p className="text-xs font-bold leading-tight max-w-[120px] truncate text-white">
                {displayName}
              </p>
              <p className="text-[10px] text-emerald-200 leading-tight">
                {roleName}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white font-semibold text-xs px-3 py-2 rounded-xl transition-all border border-white/20 shadow-sm"
            title="Log out of your account"
          >
            <span>Log out</span>
            <span className="text-xs">→</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
