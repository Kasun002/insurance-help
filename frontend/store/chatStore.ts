'use client'

import { create } from 'zustand'
import type { ChatMessage } from '@/types/api'

interface ChatState {
  isOpen: boolean
  sessionId: string | null
  messages: ChatMessage[]
  isGenerating: boolean
  seedArticleId: string | null

  openChat: (seedArticleId?: string) => void
  closeChat: () => void
  setSessionId: (id: string) => void
  addMessage: (msg: ChatMessage) => void
  setGenerating: (v: boolean) => void
  resetSession: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  sessionId: null,
  messages: [],
  isGenerating: false,
  seedArticleId: null,

  openChat: (seedArticleId) =>
    set((s) => ({
      isOpen: true,
      seedArticleId: seedArticleId ?? s.seedArticleId,
    })),

  closeChat: () => set({ isOpen: false }),

  setSessionId: (id) => set({ sessionId: id }),

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  setGenerating: (v) => set({ isGenerating: v }),

  resetSession: () =>
    set({ sessionId: null, messages: [], isGenerating: false, seedArticleId: null }),
}))
