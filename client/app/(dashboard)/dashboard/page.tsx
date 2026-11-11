import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import StudentDashboard from '@/components/dashboard/StudentDashboard'

// Keep instant = false for Next.js 16 cacheComponents dynamic access
export const instant = false

export default async function DashboardPage() {
  await connection()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, username, role')
    .eq('id', user!.id)
    .single()

  return <StudentDashboard user={user!} profile={profile} />
}
