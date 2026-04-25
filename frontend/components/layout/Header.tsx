'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Shield, MessageCircle, Menu, X } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { Button } from '@/components/ui/button'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const openChat = useChatStore((s) => s.openChat)

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <Shield className="h-5 w-5 text-slate-700" />
          <span>InsureHelp</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6">
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Guides
          </Link>
          <Link
            href="mailto:support@insurehelp.sg"
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Contact
          </Link>
          <Button size="sm" onClick={() => openChat()} className="gap-1.5">
            <MessageCircle className="h-4 w-4" />
            Ask AI
          </Button>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 py-3 flex flex-col gap-3">
          <Link
            href="/"
            className="text-sm text-slate-700 py-1"
            onClick={() => setMenuOpen(false)}
          >
            Guides
          </Link>
          <Link
            href="mailto:support@insurehelp.sg"
            className="text-sm text-slate-700 py-1"
            onClick={() => setMenuOpen(false)}
          >
            Contact
          </Link>
          <Button
            size="sm"
            className="gap-1.5 w-fit"
            onClick={() => {
              openChat()
              setMenuOpen(false)
            }}
          >
            <MessageCircle className="h-4 w-4" />
            Ask AI
          </Button>
        </div>
      )}
    </header>
  )
}
