import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useSearch } from '@/hooks/useSearch'
import * as searchApi from '@/lib/api/search'
import { QueryClient } from '@tanstack/react-query'
import { searchResultFixture, searchResultFixture2 } from '../fixtures'

jest.mock('@/lib/api/search')
const mockSearchArticles = searchApi.searchArticles as jest.MockedFunction<
  typeof searchApi.searchArticles
>

// Fresh QueryClient per test — retry:false so errors resolve immediately
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useSearch', () => {
  // ─── Disabled states ─────────────────────────────────────────────────────────

  it('does not fetch when query is empty string', () => {
    renderHook(() => useSearch(''), { wrapper: makeWrapper() })
    expect(mockSearchArticles).not.toHaveBeenCalled()
  })

  it('does not fetch when query is a single character', () => {
    renderHook(() => useSearch('a'), { wrapper: makeWrapper() })
    expect(mockSearchArticles).not.toHaveBeenCalled()
  })

  it('query status is idle when disabled', () => {
    const { result } = renderHook(() => useSearch(''), { wrapper: makeWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })

  // ─── Enabled states ──────────────────────────────────────────────────────────

  it('fetches when query length is exactly 2', async () => {
    mockSearchArticles.mockResolvedValueOnce([searchResultFixture])
    const { result } = renderHook(() => useSearch('cl'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockSearchArticles).toHaveBeenCalledWith('cl')
  })

  it('returns results array on success', async () => {
    mockSearchArticles.mockResolvedValueOnce([searchResultFixture, searchResultFixture2])
    const { result } = renderHook(() => useSearch('claims'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data![0]).toEqual(searchResultFixture)
  })

  it('returns empty array when API returns no results', async () => {
    mockSearchArticles.mockResolvedValueOnce([])
    const { result } = renderHook(() => useSearch('xyzzy'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('enters error state when API call fails', async () => {
    // Suppress console.error from TanStack Query during error test
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockSearchArticles.mockRejectedValueOnce(new Error('API error'))
    const { result } = renderHook(() => useSearch('claims'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('uses separate cache entries for different queries', async () => {
    mockSearchArticles
      .mockResolvedValueOnce([searchResultFixture])
      .mockResolvedValueOnce([searchResultFixture2])

    const wrapper = makeWrapper()
    const { result: r1 } = renderHook(() => useSearch('claim'), { wrapper })
    const { result: r2 } = renderHook(() => useSearch('reject'), { wrapper })

    await waitFor(() => expect(r1.current.isSuccess).toBe(true))
    await waitFor(() => expect(r2.current.isSuccess).toBe(true))

    expect(r1.current.data![0].article_id).toBe('art-1')
    expect(r2.current.data![0].article_id).toBe('art-2')
  })
})
