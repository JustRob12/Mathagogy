import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/components/dashboard/DashboardNav'

export const instant = false

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await connection()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the profile to get name, username and role
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, username, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <DashboardNav user={user} profile={profile} />
      <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
