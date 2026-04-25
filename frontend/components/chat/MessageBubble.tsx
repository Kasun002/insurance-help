'use client'

import type { ChatMessage } from '@/types/api'
import SourceCitation from './SourceCitation'

interface MessageBubbleProps {
  message: ChatMessage
  isLastMessage: boolean
  isGenerating: boolean
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="text-xs text-slate-400 mr-1">Thinking</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

export default function MessageBubble({
  message,
  isLastMessage,
  isGenerating,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'

  // Show thinking dots after the last user message while generating
  const showThinking = isLastMessage && isUser && isGenerating

  return (
    <>
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-3`}>
        <div
          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-slate-900 text-white rounded-br-sm'
              : message.error
                ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
          }`}
        >
          {message.content}
        </div>
      </div>

      {/* Source chips below assistant messages */}
      {!isUser && !message.error && message.sources && message.sources.length > 0 && (
        <div className="px-3">
          <SourceCitation sources={message.sources} />
        </div>
      )}

      {/* Thinking indicator */}
      {showThinking && (
        <div className="flex justify-start px-3">
          <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm">
            <ThinkingDots />
          </div>
        </div>
      )}
    </>
  )
}
