'use client'

import { useChatStore } from '@/store/chatStore'

const CHIPS_BY_STAGE: Record<number, string[]> = {
  0: ['Tell me more', 'What documents do I need?', 'How long does it take?'],
  1: ['Any other requirements?', 'What if my claim is rejected?', 'Contact support'],
}

interface SuggestionChipsProps {
  messageCount: number
}

export default function SuggestionChips({ messageCount }: SuggestionChipsProps) {
  const sendMessage = useChatStore((s) => s.sendMessage)
  const isGenerating = useChatStore((s) => s.isGenerating)

  const stage = messageCount >= 4 ? 1 : 0
  const chips = CHIPS_BY_STAGE[stage]

  if (isGenerating) return null

  return (
    <div className="px-3 pb-2 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip}
          onClick={() => sendMessage(chip)}
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full transition-colors border border-slate-200"
        >
          {chip}
        </button>
      ))}
    </div>
  )
}
