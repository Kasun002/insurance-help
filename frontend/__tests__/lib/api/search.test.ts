import { searchArticles } from '@/lib/api/search'
import * as clientModule from '@/lib/api/client'
import { searchResultFixture, searchResultFixture2 } from '../../fixtures'

jest.mock('@/lib/api/client', () => ({
  ...jest.requireActual('@/lib/api/client'),
  apiFetch: jest.fn(),
}))

const mockApiFetch = clientModule.apiFetch as jest.MockedFunction<typeof clientModule.apiFetch>

const searchEnvelope = (results = [searchResultFixture]) => ({
  results,
  total: results.length,
  query: 'claim',
})

describe('searchArticles', () => {
  it('calls /search with encoded query and default limit=3', async () => {
    mockApiFetch.mockResolvedValueOnce(searchEnvelope())
    await searchArticles('claims')
    expect(mockApiFetch).toHaveBeenCalledWith('/search?q=claims&limit=3')
  })

  it('URL-encodes query with special characters', async () => {
    mockApiFetch.mockResolvedValueOnce(searchEnvelope([]))
    await searchArticles('life & health')
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/search?q=${encodeURIComponent('life & health')}&limit=3`
    )
  })

  it('respects a custom limit argument', async () => {
    mockApiFetch.mockResolvedValueOnce(searchEnvelope())
    await searchArticles('test', 10)
    expect(mockApiFetch).toHaveBeenCalledWith('/search?q=test&limit=10')
  })

  it('returns the results array', async () => {
    mockApiFetch.mockResolvedValueOnce(searchEnvelope([searchResultFixture, searchResultFixture2]))
    const results = await searchArticles('claim')
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual(searchResultFixture)
  })

  it('returns empty array when there are no matches', async () => {
    mockApiFetch.mockResolvedValueOnce(searchEnvelope([]))
    const results = await searchArticles('xyzzy')
    expect(results).toEqual([])
  })

  it('propagates apiFetch errors', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('HTTP 500'))
    await expect(searchArticles('claim')).rejects.toThrow('HTTP 500')
  })
})
