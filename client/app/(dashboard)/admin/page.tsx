import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import AdminDashboard from '@/components/admin/AdminDashboard'

// Keep instant = false for Next.js 16 cacheComponents dynamic access
export const instant = false

export default async function AdminPage() {
  await connection()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Strictly enforce role === 0 for the admin portal
  if (!profile || profile.role !== 0) {
    redirect('/dashboard')
  }

  return <AdminDashboard user={user} profile={profile} />
}

