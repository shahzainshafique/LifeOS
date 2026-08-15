import type { Metadata, Viewport } from 'next'
import { Geist, Noto_Sans, Playfair_Display } from 'next/font/google'
import { cn } from '@/lib/utils'
import './globals.css'
import { RegisterSW } from './register-sw'

const playfairDisplayHeading = Playfair_Display({ subsets: ['latin'], variable: '--font-heading' })
const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-sans' })
const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LifeOS',
  description: 'Your personal operating system',
  appleWebApp: { capable: true, title: 'LifeOS', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0b0c',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', notoSans.variable, playfairDisplayHeading.variable)}>
      <body className={geist.className}>
        {children}
        <RegisterSW />
      </body>
    </html>
  )
}
