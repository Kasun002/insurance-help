import { apiFetch } from './client'
import type { ChatSession, SourceCitation } from '@/types/api'

export interface ChatMessageResponse {
  message_id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  sources: SourceCitation[]
  created_at: string
}

export async function createSession(seedArticleId?: string): Promise<ChatSession> {
  return apiFetch<ChatSession>('/chat/sessions', {
    method: 'POST',
    body: JSON.stringify(seedArticleId ? { seed_article_id: seedArticleId } : {}),
  })
}

export async function sendMessage(
  sessionId: string,
  message: string,
  signal?: AbortSignal
): Promise<ChatMessageResponse> {
  return apiFetch<ChatMessageResponse>(`/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
    signal,
  })
}
