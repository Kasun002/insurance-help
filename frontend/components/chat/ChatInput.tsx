'use client'

import { useRef, useState } from 'react'
import { SendHorizonal } from 'lucide-react'

const MAX_CHARS = 2000
const LINE_HEIGHT = 24 // px
const MAX_LINES = 4

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function resize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxH = LINE_HEIGHT * MAX_LINES + 16 // padding
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (e.target.value.length > MAX_CHARS) return
    setValue(e.target.value)
    resize()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const msg = value.trim()
    if (!msg || disabled) return
    onSend(msg)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const remaining = MAX_CHARS - value.length
  const nearLimit = remaining < 200

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
            rows={1}
            aria-label="Chat message"
            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {nearLimit && (
            <span className="absolute bottom-2 right-3 text-xs text-slate-400 pointer-events-none">
              {remaining}
            </span>
          )}
        </div>
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="shrink-0 flex items-center justify-center w-11 h-11 rounded-lg bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <SendHorizonal className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
