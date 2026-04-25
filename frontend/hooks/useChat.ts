import { useChatStore } from '@/store/chatStore'

export function useChat() {
  const messages = useChatStore((s) => s.messages)
  const isGenerating = useChatStore((s) => s.isGenerating)
  const sessionId = useChatStore((s) => s.sessionId)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const canSend = (!isGenerating && sessionId !== null) || messages.length === 0
  return { messages, isGenerating, sessionId, sendMessage, canSend }
}
