import { useChatStore } from '@/store/chatStore'

export function useChat() {
  const store = useChatStore()
  return {
    ...store,
    canSend:
      (!store.isGenerating && store.sessionId !== null) || store.messages.length === 0,
  }
}
