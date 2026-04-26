'use client'

import { create } from 'zustand'
import { createSession, sendMessage as apiSendMessage } from '@/lib/api/chat'
import { ApiError } from '@/lib/api/client'
import type { ChatMessage } from '@/types/api'

const SESSION_KEY = 'insurehelp_chat_session'

function loadPersistedSessionId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(SESSION_KEY)
}

function persistSessionId(id: string | null) {
  if (typeof window === 'undefined') return
  if (id) localStorage.setItem(SESSION_KEY, id)
  else localStorage.removeItem(SESSION_KEY)
}

function makeOptimisticUserMsg(content: string, sessionId: string): ChatMessage {
  return {
    id: `local_${Date.now()}`,
    session_id: sessionId,
    role: 'user',
    content,
    created_at: new Date().toISOString(),
  }
}

function makeErrorMsg(sessionId: string, text?: string): ChatMessage {
  return {
    id: `err_${Date.now()}`,
    session_id: sessionId,
    role: 'assistant',
    content: text ?? 'Sorry, something went wrong. Please try again.',
    created_at: new Date().toISOString(),
    error: true,
  }
}

// Module-level abort controller — not reactive, just used to cancel in-flight requests
let activeController: AbortController | null = null

interface ChatState {
  isOpen: boolean
  sessionId: string | null
  messages: ChatMessage[]
  isGenerating: boolean
  seedArticleId: string | null

  openChat: (seedArticleId?: string) => Promise<void>
  closeChat: () => void
  sendMessage: (content: string) => Promise<void>
  resetSession: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Start with null — load from localStorage lazily on first openChat (SSR-safe)
  isOpen: false,
  sessionId: null,
  messages: [],
  isGenerating: false,
  seedArticleId: null,

  openChat: async (seedArticleId) => {
    // Lazily restore persisted session on first open
    const persisted = loadPersistedSessionId()
    const state = get()
    const currentSessionId = state.sessionId ?? persisted

    // If seed article changed, start a fresh session
    const needNewSession =
      seedArticleId !== undefined && seedArticleId !== state.seedArticleId

    if (needNewSession || !currentSessionId) {
      try {
        const session = await createSession(seedArticleId)
        persistSessionId(session.session_id)
        set({
          isOpen: true,
          sessionId: session.session_id,
          seedArticleId: seedArticleId ?? null,
          messages: [],
        })
      } catch {
        // Open widget anyway — sendMessage will create the session lazily
        set({ isOpen: true, seedArticleId: seedArticleId ?? null })
      }
    } else {
      set({ isOpen: true, sessionId: currentSessionId })
    }
  },

  closeChat: () => set({ isOpen: false }),

  sendMessage: async (content: string) => {
    // 2.5: deduplication guard — ignore if already waiting for a response
    if (get().isGenerating) return

    let { sessionId } = get()

    // Lazily create session if missing
    if (!sessionId) {
      try {
        const session = await createSession(get().seedArticleId ?? undefined)
        sessionId = session.session_id
        persistSessionId(sessionId)
        set({ sessionId })
      } catch {
        set((s) => ({ messages: [...s.messages, makeErrorMsg('unknown')] }))
        return
      }
    }

    // 2.4: cancel any previous in-flight request and start a new controller
    activeController?.abort()
    activeController = new AbortController()
    const { signal } = activeController

    // Optimistic user bubble
    const userMsg = makeOptimisticUserMsg(content, sessionId)
    set((s) => ({ messages: [...s.messages, userMsg], isGenerating: true }))

    try {
      const response = await apiSendMessage(sessionId, content, signal)

      // If request was aborted (e.g. resetSession called mid-flight), do nothing
      if (signal.aborted) return

      const assistantMsg: ChatMessage = {
        id: response.message_id,
        session_id: response.session_id,
        role: response.role,
        content: response.content,
        sources: response.sources,
        created_at: response.created_at,
      }

      // Sync session_id from response — BE may have auto-created a new session
      // (e.g. after a server restart) and returns the new ID in the response body.
      if (response.session_id !== sessionId) {
        persistSessionId(response.session_id)
        set((s) => ({ messages: [...s.messages, assistantMsg], isGenerating: false, sessionId: response.session_id }))
      } else {
        set((s) => ({ messages: [...s.messages, assistantMsg], isGenerating: false }))
      }
    } catch (err) {
      if (signal.aborted) return

      const text = err instanceof Error ? err.message : undefined
      set((s) => ({
        messages: [...s.messages, makeErrorMsg(sessionId!, text)],
        isGenerating: false,
      }))
    }
  },

  resetSession: () => {
    // 2.4: abort any in-flight request so isGenerating doesn't stay stuck
    activeController?.abort()
    activeController = null
    persistSessionId(null)
    set({ sessionId: null, messages: [], isGenerating: false, seedArticleId: null })
  },
}))
