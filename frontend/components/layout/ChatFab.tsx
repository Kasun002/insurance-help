'use client'

import { MessageCircle } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'

export default function ChatFab() {
  const { isOpen, openChat } = useChatStore()

  return (
    <button
      onClick={() => openChat()}
      aria-label="Open AI chat"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-700 transition-colors"
    >
      <MessageCircle className="h-6 w-6" />
      {isOpen && (
        <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
      )}
    </button>
  )
}
