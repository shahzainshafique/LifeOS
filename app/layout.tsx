import type { Metadata } from 'next'
import { Geist, Noto_Sans, Playfair_Display } from 'next/font/google'
import { cn } from "@/lib/utils";
import "./globals.css";

const playfairDisplayHeading = Playfair_Display({subsets:['latin'],variable:'--font-heading'});

const notoSans = Noto_Sans({subsets:['latin'],variable:'--font-sans'});

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LifeOS',
  description: 'Your personal operating system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn("font-sans", notoSans.variable, playfairDisplayHeading.variable)}>
      <body className={geist.className}>
        {children}
      </body>
    </html>
  )
}