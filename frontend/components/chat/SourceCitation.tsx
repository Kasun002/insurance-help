'use client'

import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import type { SourceCitation as SourceCitationType } from '@/types/api'

interface SourceCitationProps {
  sources: SourceCitationType[]
}

export default function SourceCitation({ sources }: SourceCitationProps) {
  const router = useRouter()
  const closeChat = useChatStore((s) => s.closeChat)

  if (!sources || sources.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.map((source) => (
        <button
          key={source.article_id}
          onClick={() => {
            closeChat()
            router.push(`/article/${source.slug}`)
          }}
          className="inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 px-2 py-1 rounded-full transition-colors max-w-[200px]"
          title={source.title}
        >
          <FileText className="h-3 w-3 shrink-0" />
          <span className="truncate">{source.title}</span>
        </button>
      ))}
    </div>
  )
}
