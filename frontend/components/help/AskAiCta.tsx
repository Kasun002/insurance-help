'use client'

import { MessageCircle } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { Button } from '@/components/ui/button'

interface AskAiCtaProps {
  articleId: string
}

export default function AskAiCta({ articleId }: AskAiCtaProps) {
  const openChat = useChatStore((s) => s.openChat)

  return (
    <div className="mt-10 p-5 bg-slate-900 rounded-xl text-center">
      <p className="text-white font-medium mb-1">Still have questions?</p>
      <p className="text-slate-400 text-sm mb-4">
        Our AI assistant can answer specific questions about this topic.
      </p>
      <Button
        variant="outline"
        className="bg-white text-slate-900 hover:bg-slate-100 border-white"
        onClick={() => openChat(articleId)}
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        Ask AI Assistant
      </Button>
    </div>
  )
}
