export type ChatRole = 'user' | 'assistant'

export interface LocalChatMessage {
  id: string
  role: ChatRole
  content: string
  sources?: import('./api').SourceCitation[]
  created_at: string
  error?: boolean
  pending?: boolean
}
