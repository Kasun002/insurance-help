'use client'

import { useEffect, useRef } from 'react'
import { useChat } from '@/hooks/useChat'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import EmptyChat from './EmptyChat'
import SuggestionChips from './SuggestionChips'

export default function ChatPanel() {
  const { messages, isGenerating, sendMessage, canSend } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom whenever messages change or generating state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isGenerating])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Message list */}
      <div
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
