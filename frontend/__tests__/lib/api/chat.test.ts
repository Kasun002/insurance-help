import { createSession, sendMessage } from '@/lib/api/chat'
import * as clientModule from '@/lib/api/client'
import { chatSessionFixture, chatMessageResponseFixture } from '../../fixtures'

jest.mock('@/lib/api/client', () => ({
  ...jest.requireActual('@/lib/api/client'),
  apiFetch: jest.fn(),
}))

const mockApiFetch = clientModule.apiFetch as jest.MockedFunction<typeof clientModule.apiFetch>

describe('createSession', () => {
  it('POSTs to /chat/sessions with empty body when no seed article', async () => {
    mockApiFetch.mockResolvedValueOnce(chatSessionFixture)
    await createSession()
    expect(mockApiFetch).toHaveBeenCalledWith('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  })

  it('includes seed_article_id in body when provided', async () => {
    mockApiFetch.mockResolvedValueOnce(chatSessionFixture)
    await createSession('art-1')
    expect(mockApiFetch).toHaveBeenCalledWith('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ seed_article_id: 'art-1' }),
    })
  })

  it('returns the chat session object', async () => {
    mockApiFetch.mockResolvedValueOnce(chatSessionFixture)
    const result = await createSession()
    expect(result).toEqual(chatSessionFixture)
  })

  it('propagates apiFetch errors', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('HTTP 503'))
    await expect(createSession()).rejects.toThrow('HTTP 503')
  })
})

describe('sendMessage', () => {
  it('POSTs to the correct session messages endpoint', async () => {
    mockApiFetch.mockResolvedValueOnce(chatMessageResponseFixture)
    await sendMessage('sess-abc123', 'Hello')
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/chat/sessions/sess-abc123/messages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'Hello' }),
      })
    )
  })

  it('passes the abort signal through to apiFetch', async () => {
    mockApiFetch.mockResolvedValueOnce(chatMessageResponseFixture)
    const controller = new AbortController()
    await sendMessage('sess-1', 'Hi', controller.signal)
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal })
    )
  })

  it('omits signal from call when none provided', async () => {
    mockApiFetch.mockResolvedValueOnce(chatMessageResponseFixture)
    await sendMessage('sess-1', 'Hi')
    const [, init] = (mockApiFetch.mock.calls[0] as [string, RequestInit])
    expect(init.signal).toBeUndefined()
  })

  it('returns the ChatMessageResponse object', async () => {
    mockApiFetch.mockResolvedValueOnce(chatMessageResponseFixture)
    const result = await sendMessage('sess-abc123', 'How do I file a claim?')
    expect(result).toEqual(chatMessageResponseFixture)
    expect(result.message_id).toBe('msg-001')
    expect(result.role).toBe('assistant')
  })

  it('propagates 429 rate-limit errors', async () => {
    const { ApiError } = jest.requireActual('@/lib/api/client')
    mockApiFetch.mockRejectedValueOnce(new ApiError('Rate limit exceeded', 429))
    await expect(sendMessage('sess-1', 'Hi')).rejects.toMatchObject({ status: 429 })
  })
})
