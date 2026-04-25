'use client'

import { useChatStore } from '@/store/chatStore'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { X, RotateCcw } from 'lucide-react'
import ChatPanel from './ChatPanel'

export default function ChatWidget() {
  const { isOpen, closeChat, resetSession, messages } = useChatStore()

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeChat()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[420px] p-0 flex flex-col gap-0"
      >
        <SheetHeader className="px-4 py-3 border-b border-slate-200 flex-row items-center justify-between space-y-0 shrink-0">
          <SheetTitle className="text-base font-semibold">AI Assistant</SheetTitle>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={resetSession}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Start new conversation"
                title="New conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={closeChat}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <ChatPanel />
        </div>
      </SheetContent>
    </Sheet>
  )
}
