import { apiFetch } from './client'
import type { ChatSession, ChatMessage } from '@/types/api'

export async function createSession(seedArticleId?: string): Promise<ChatSession> {
  return apiFetch<ChatSession>('/chat/sessions', {
    method: 'POST',
    body: JSON.stringify(seedArticleId ? { seed_article_id: seedArticleId } : {}),
  })
}

export async function sendMessage(sessionId: string, message: string): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(`/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}
