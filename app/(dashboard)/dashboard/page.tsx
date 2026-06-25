import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div>
      <h1>Welcome to LifeOS</h1>
      <p>Signed in as {user?.email}</p>
    </div>
  )
}