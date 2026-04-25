'use client'

// Stub — full implementation in Phase 4
import { useChatStore } from '@/store/chatStore'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { X } from 'lucide-react'

export default function ChatWidget() {
  const { isOpen, closeChat } = useChatStore()

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeChat()}>
      <SheetContent side="right" className="w-full sm:max-w-[420px] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-slate-200 flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-base font-semibold">AI Assistant</SheetTitle>
          <button
            onClick={closeChat}
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Chat coming in Phase 4
        </div>
      </SheetContent>
    </Sheet>
  )
}
