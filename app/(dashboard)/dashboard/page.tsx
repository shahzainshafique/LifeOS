import { redirect } from 'next/navigation'

// Legacy route — the home surface is now /now.
export default function DashboardPage() {
  redirect('/now')
}
