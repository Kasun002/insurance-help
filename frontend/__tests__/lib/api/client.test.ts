import { apiFetch, ApiError } from '@/lib/api/client'
import { mockResponse } from '../../fixtures'

// In jsdom, window is defined so getBase() returns '/api/v1'
const BASE = '/api/v1'

describe('apiFetch', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    // jsdom may not have fetch as a native global; assign a jest.fn() directly
    fetchMock = jest.fn()
    global.fetch = fetchMock
  })

  afterEach(() => {
    // restoreAllMocks in setup.ts handles the rest
  })

  // ─── Happy path ─────────────────────────────────────────────────────────────

  it('calls fetch with the correct full URL', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { ok: true }))
    await apiFetch('/categories')
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/categories`,
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    )
  })

  it('returns parsed JSON body on 2xx', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { name: 'Claims' }))
    const result = await apiFetch<{ name: string }>('/categories')
    expect(result).toEqual({ name: 'Claims' })
  })

  it('merges caller headers without overwriting Content-Type by default', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, {}))
    await apiFetch('/test', { headers: { Authorization: 'Bearer token' } })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        }),
      })
    )
  })

  it('forwards method, body, and signal to fetch', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, {}))
    const controller = new AbortController()
    await apiFetch('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ message: 'hi' }),
      signal: controller.signal,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'hi' }),
        signal: controller.signal,
      })
    )
  })

  // ─── Error shapes ────────────────────────────────────────────────────────────

  it('throws ApiError on non-2xx with error.message shape', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(400, { error: { message: 'Invalid input' } })
    )
    await expect(apiFetch('/test')).rejects.toThrow('Invalid input')
  })

  it('throws ApiError on non-2xx with error.detail shape', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(422, { error: { detail: 'Validation failed' } })
    )
    await expect(apiFetch('/test')).rejects.toThrow('Validation failed')
  })

  it('throws ApiError on non-2xx with top-level detail shape', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(422, { detail: 'Unprocessable' }))
    await expect(apiFetch('/test')).rejects.toThrow('Unprocessable')
  })

  it('throws ApiError on non-2xx with top-level message shape', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(400, { message: 'Bad request' }))
    await expect(apiFetch('/test')).rejects.toThrow('Bad request')
  })

  it('falls back to "HTTP <status>" when body has no recognisable message', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(500, {}))
    await expect(apiFetch('/test')).rejects.toThrow('HTTP 500')
  })

  it('does NOT attempt JSON.parse on non-JSON content-type (e.g. nginx 502)', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(502, '<html>Bad Gateway</html>', 'text/html')
    )
    await expect(apiFetch('/test')).rejects.toThrow('HTTP 502')
  })

  it('still throws gracefully when JSON parsing of error body fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: { get: () => 'application/json' },
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    } as unknown as Response)
    await expect(apiFetch('/test')).rejects.toThrow('HTTP 503')
  })

  // ─── ApiError properties ─────────────────────────────────────────────────────

  it('thrown error is an instance of ApiError', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(404, { detail: 'Not found' }))
    await expect(apiFetch('/test')).rejects.toBeInstanceOf(ApiError)
  })

  it('ApiError carries the HTTP status code', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(429, { error: { message: 'Rate limit' } }))
    let caught: ApiError | null = null
    try {
      await apiFetch('/test')
    } catch (e) {
      caught = e as ApiError
    }
    expect(caught).not.toBeNull()
    expect(caught!.status).toBe(429)
    expect(caught!.message).toBe('Rate limit')
  })

  it('ApiError name is "ApiError"', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(500, {}))
    let caught: ApiError | null = null
    try {
      await apiFetch('/test')
    } catch (e) {
      caught = e as ApiError
    }
    expect(caught!.name).toBe('ApiError')
  })
})
