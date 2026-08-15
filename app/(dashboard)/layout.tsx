import Link from 'next/link'
import { Ambient } from './ambient'
import { NavLink } from './nav-link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <Ambient />
      <nav className="sticky top-0 z-20 border-b border-border/60 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center gap-1 px-4 py-3">
          <Link href="/now" className="mr-auto font-heading text-lg tracking-tight">
            LifeOS
          </Link>
          <NavLink href="/now">Now</NavLink>
          <NavLink href="/chat">Talk</NavLink>
          <NavLink href="/memory">Memory</NavLink>
        </div>
      </nav>
      {children}
    </div>
  )
}
