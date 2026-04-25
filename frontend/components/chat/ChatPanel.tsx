'use client'

import { useEffect, useRef } from 'react'
import { useChat } from '@/hooks/useChat'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import EmptyChat from './EmptyChat'
import SuggestionChips from './SuggestionChips'

const NEAR_BOTTOM_THRESHOLD = 80 // px

export default function ChatPanel() {
  const { messages, isGenerating, sendMessage, canSend } = useChat()
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isNearBottom = useRef(true)

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    isNearBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD
  }

  // Auto-scroll only when the user is already near the bottom
  useEffect(() => {
    if (!isNearBottom.current) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isGenerating])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Message list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 space-y-3"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.length === 0 ? (
          <EmptyChat />
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isLastMessage={i === messages.length - 1}
              isGenerating={isGenerating}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips — only when there are messages */}
      {messages.length > 0 && (
        <SuggestionChips messageCount={messages.length} />
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={!canSend} />
    </div>
  )
}
