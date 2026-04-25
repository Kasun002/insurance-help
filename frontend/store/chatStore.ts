'use client'

import { create } from 'zustand'
import { createSession, sendMessage as apiSendMessage } from '@/lib/api/chat'
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

function makeErrorMsg(sessionId: string): ChatMessage {
  return {
    id: `err_${Date.now()}`,
    session_id: sessionId,
    role: 'assistant',
    content: 'Sorry, something went wrong. Please try again.',
    created_at: new Date().toISOString(),
    error: true,
  }
}

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
  isOpen: false,
  sessionId: loadPersistedSessionId(),
  messages: [],
  isGenerating: false,
  seedArticleId: null,

  openChat: async (seedArticleId) => {
    const state = get()

    // If seed article changed, start a fresh session
    const needNewSession =
      seedArticleId !== undefined && seedArticleId !== state.seedArticleId

    if (needNewSession || state.sessionId === null) {
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
        // Fall through — open widget anyway, sendMessage will create session lazily
        set({ isOpen: true, seedArticleId: seedArticleId ?? null })
      }
    } else {
      set({ isOpen: true })
    }
  },

  closeChat: () => set({ isOpen: false }),

  sendMessage: async (content: string) => {
    let { sessionId } = get()

    // Lazily create session if missing
    if (!sessionId) {
      try {
        const session = await createSession(get().seedArticleId ?? undefined)
        sessionId = session.session_id
        persistSessionId(sessionId)
        set({ sessionId })
      } catch {
        set((s) => ({
          messages: [
            ...s.messages,
            makeErrorMsg('unknown'),
          ],
        }))
        return
      }
    }

    // Optimistic user bubble
    const userMsg = makeOptimisticUserMsg(content, sessionId)
    set((s) => ({
      messages: [...s.messages, userMsg],
      isGenerating: true,
    }))

    try {
      const response = await apiSendMessage(sessionId, content)
      const assistantMsg: ChatMessage = {
        id: response.message_id,
        session_id: response.session_id,
        role: response.role,
        content: response.content,
        sources: response.sources,
        created_at: response.created_at,
      }
      set((s) => ({
        messages: [...s.messages, assistantMsg],
        isGenerating: false,
      }))
    } catch (err) {
      const errMsg = makeErrorMsg(sessionId)
      // Preserve the original error text if available
      if (err instanceof Error) errMsg.content = err.message
      set((s) => ({
        messages: [...s.messages, errMsg],
        isGenerating: false,
      }))
    }
  },

  resetSession: () => {
    persistSessionId(null)
    set({ sessionId: null, messages: [], isGenerating: false, seedArticleId: null })
  },
}))
