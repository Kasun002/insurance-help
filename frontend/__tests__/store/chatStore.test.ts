import { act } from '@testing-library/react'
import { useChatStore } from '@/store/chatStore'
import * as chatApi from '@/lib/api/chat'
import { ApiError } from '@/lib/api/client'
import {
  chatSessionFixture,
  chatMessageResponseFixture,
} from '../fixtures'

jest.mock('@/lib/api/chat')

const mockCreateSession = chatApi.createSession as jest.MockedFunction<typeof chatApi.createSession>
const mockSendMessage = chatApi.sendMessage as jest.MockedFunction<typeof chatApi.sendMessage>

const INITIAL_STATE = {
  isOpen: false,
  sessionId: null,
  messages: [],
  isGenerating: false,
  seedArticleId: null,
} as const

function resetStore() {
  // Merge reset (no replace=true) so actions defined in the store are preserved
  useChatStore.setState(INITIAL_STATE)
}

beforeEach(() => {
  resetStore()
  jest.clearAllMocks() // reset call counts between tests
  mockCreateSession.mockResolvedValue(chatSessionFixture)
  mockSendMessage.mockResolvedValue(chatMessageResponseFixture)
})

// ─── openChat ─────────────────────────────────────────────────────────────────

describe('openChat', () => {
  it('creates a new session and sets isOpen + sessionId', async () => {
    await act(async () => { await useChatStore.getState().openChat() })

    const { isOpen, sessionId } = useChatStore.getState()
    expect(isOpen).toBe(true)
    expect(sessionId).toBe(chatSessionFixture.session_id)
    expect(mockCreateSession).toHaveBeenCalledTimes(1)
  })

  it('persists session_id to localStorage', async () => {
    await act(async () => { await useChatStore.getState().openChat() })
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'insurehelp_chat_session',
      chatSessionFixture.session_id
    )
  })

  it('reuses an existing session when called again without seed change', async () => {
    await act(async () => { await useChatStore.getState().openChat() })
    useChatStore.setState({ isOpen: false })

    await act(async () => { await useChatStore.getState().openChat() })

    // createSession must NOT be called a second time
    expect(mockCreateSession).toHaveBeenCalledTimes(1)
    expect(useChatStore.getState().isOpen).toBe(true)
  })

  it('creates a NEW session and clears messages when seed article changes', async () => {
    useChatStore.setState({
      sessionId: 'old-session',
      seedArticleId: 'art-1',
      messages: [{ id: '1', session_id: 'old-session', role: 'user', content: 'Hi', created_at: '' }],
    })

    await act(async () => { await useChatStore.getState().openChat('art-2') })

    expect(mockCreateSession).toHaveBeenCalledWith('art-2')
    expect(useChatStore.getState().messages).toEqual([])
    expect(useChatStore.getState().sessionId).toBe(chatSessionFixture.session_id)
  })

  it('passes seedArticleId to createSession', async () => {
    await act(async () => { await useChatStore.getState().openChat('art-99') })
    expect(mockCreateSession).toHaveBeenCalledWith('art-99')
  })

  it('still opens the widget if session creation fails (graceful fallback)', async () => {
    mockCreateSession.mockRejectedValueOnce(new Error('Network error'))
    await act(async () => { await useChatStore.getState().openChat() })

    expect(useChatStore.getState().isOpen).toBe(true)
    // sessionId remains null; sendMessage will retry lazily
    expect(useChatStore.getState().sessionId).toBeNull()
  })
})

// ─── sendMessage ──────────────────────────────────────────────────────────────

describe('sendMessage', () => {
  // Set up a valid session before each send test
  beforeEach(async () => {
    await act(async () => { await useChatStore.getState().openChat() })
  })

  it('appends an optimistic user message immediately', async () => {
    let messagesWhileSending: typeof useChatStore.getState.prototype = []
    mockSendMessage.mockImplementationOnce(async () => {
      messagesWhileSending = useChatStore.getState().messages
      return chatMessageResponseFixture
    })

    await act(async () => { await useChatStore.getState().sendMessage('Hello') })

    expect(messagesWhileSending).toHaveLength(1)
    expect(messagesWhileSending[0].role).toBe('user')
    expect(messagesWhileSending[0].content).toBe('Hello')
  })

  it('sets isGenerating=true during the request, false after', async () => {
    let generatingDuring = false
    mockSendMessage.mockImplementationOnce(async () => {
      generatingDuring = useChatStore.getState().isGenerating
      return chatMessageResponseFixture
    })

    await act(async () => { await useChatStore.getState().sendMessage('Hello') })

    expect(generatingDuring).toBe(true)
    expect(useChatStore.getState().isGenerating).toBe(false)
  })

  it('appends the assistant response after success', async () => {
    await act(async () => { await useChatStore.getState().sendMessage('Hello') })

    const { messages } = useChatStore.getState()
    expect(messages).toHaveLength(2)
    expect(messages[1].role).toBe('assistant')
    expect(messages[1].id).toBe(chatMessageResponseFixture.message_id)
    expect(messages[1].content).toBe(chatMessageResponseFixture.content)
    expect(messages[1].sources).toEqual(chatMessageResponseFixture.sources)
  })

  it('ignores a second send while already generating (deduplication)', async () => {
    let resolveFirst!: (v: typeof chatMessageResponseFixture) => void
    mockSendMessage.mockImplementationOnce(
      () => new Promise((r) => { resolveFirst = r })
    )

    // Start first send without awaiting
    const firstSend = useChatStore.getState().sendMessage('First')

    // isGenerating should now be true
    expect(useChatStore.getState().isGenerating).toBe(true)

    // Second send must be a no-op
    await act(async () => { await useChatStore.getState().sendMessage('Second') })
    expect(mockSendMessage).toHaveBeenCalledTimes(1)

    // Resolve first
    await act(async () => {
      resolveFirst(chatMessageResponseFixture)
      await firstSend
    })
  })

  it('adds an error message with error=true on API failure', async () => {
    mockSendMessage.mockRejectedValueOnce(new Error('Server exploded'))

    await act(async () => { await useChatStore.getState().sendMessage('Hello') })

    const { messages, isGenerating } = useChatStore.getState()
    const last = messages[messages.length - 1]
    expect(last.error).toBe(true)
    expect(last.role).toBe('assistant')
    expect(isGenerating).toBe(false)
  })

  it('uses the ApiError message text in the error bubble', async () => {
    mockSendMessage.mockRejectedValueOnce(new ApiError('Rate limit exceeded', 429))

    await act(async () => { await useChatStore.getState().sendMessage('Hello') })

    const last = useChatStore.getState().messages.at(-1)!
    expect(last.content).toBe('Rate limit exceeded')
  })

  it('clears stale session on 404 and persists the removal', async () => {
    mockSendMessage.mockRejectedValueOnce(new ApiError('Session expired', 404))

    await act(async () => { await useChatStore.getState().sendMessage('Hello') })

    expect(useChatStore.getState().sessionId).toBeNull()
    expect(localStorage.removeItem).toHaveBeenCalledWith('insurehelp_chat_session')
  })

  it('clears stale session on 410 (Gone)', async () => {
    mockSendMessage.mockRejectedValueOnce(new ApiError('Session gone', 410))

    await act(async () => { await useChatStore.getState().sendMessage('Hello') })

    expect(useChatStore.getState().sessionId).toBeNull()
  })

  it('lazily creates a session if sessionId is null before sending', async () => {
    useChatStore.setState({ sessionId: null })

    await act(async () => { await useChatStore.getState().sendMessage('First message') })

    expect(mockCreateSession).toHaveBeenCalled()
    expect(useChatStore.getState().messages.length).toBeGreaterThan(0)
  })

  it('shows error message if lazy session creation fails', async () => {
    useChatStore.setState({ sessionId: null })
    mockCreateSession.mockRejectedValueOnce(new Error('Cannot create session'))

    await act(async () => { await useChatStore.getState().sendMessage('Hello') })

    const { messages } = useChatStore.getState()
    expect(messages).toHaveLength(1)
    expect(messages[0].error).toBe(true)
  })
})

// ─── closeChat ────────────────────────────────────────────────────────────────

describe('closeChat', () => {
  it('sets isOpen to false', async () => {
    useChatStore.setState({ isOpen: true })
    act(() => useChatStore.getState().closeChat())
    expect(useChatStore.getState().isOpen).toBe(false)
  })

  it('does not clear session or messages', () => {
    useChatStore.setState({
      isOpen: true,
      sessionId: 'sess-1',
      messages: [{ id: '1', session_id: 'sess-1', role: 'user', content: 'Hi', created_at: '' }],
    })
    act(() => useChatStore.getState().closeChat())

    const { sessionId, messages } = useChatStore.getState()
    expect(sessionId).toBe('sess-1')
    expect(messages).toHaveLength(1)
  })
})

// ─── resetSession ─────────────────────────────────────────────────────────────

describe('resetSession', () => {
  it('clears sessionId, messages, isGenerating, and seedArticleId', () => {
    useChatStore.setState({
      sessionId: 'sess-1',
      messages: [{ id: '1', session_id: 'sess-1', role: 'user', content: 'Hi', created_at: '' }],
      isGenerating: true,
      seedArticleId: 'art-1',
    })

    act(() => useChatStore.getState().resetSession())

    const state = useChatStore.getState()
    expect(state.sessionId).toBeNull()
    expect(state.messages).toEqual([])
    expect(state.isGenerating).toBe(false)
    expect(state.seedArticleId).toBeNull()
  })

  it('removes persisted session from localStorage', () => {
    localStorage.setItem('insurehelp_chat_session', 'sess-old')
    act(() => useChatStore.getState().resetSession())
    expect(localStorage.removeItem).toHaveBeenCalledWith('insurehelp_chat_session')
  })

  it('does not change isOpen', () => {
    useChatStore.setState({ isOpen: true, sessionId: 'sess-1' })
    act(() => useChatStore.getState().resetSession())
    // isOpen state is unaffected by reset
    expect(useChatStore.getState().isOpen).toBe(true)
  })
})
