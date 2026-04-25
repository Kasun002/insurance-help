import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import QueryProvider from '@/components/providers/QueryProvider'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ChatFab from '@/components/layout/ChatFab'
import ChatWidget from '@/components/chat/ChatWidget'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'InsureHelp — AI Insurance Help Center',
  description: 'Get instant answers to your insurance questions with AI-powered guidance.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-slate-50 text-foreground flex flex-col min-h-screen">
        <QueryProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ChatFab />
          <ChatWidget />
        </QueryProvider>
      </body>
    </html>
  )
}
