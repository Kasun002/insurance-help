import { fetchArticles, fetchArticle } from '@/lib/api/articles'
import * as clientModule from '@/lib/api/client'
import { articleSummaryFixture, articleDetailFixture } from '../../fixtures'

jest.mock('@/lib/api/client', () => ({
  ...jest.requireActual('@/lib/api/client'),
  apiFetch: jest.fn(),
}))

const mockApiFetch = clientModule.apiFetch as jest.MockedFunction<typeof clientModule.apiFetch>

const articlesEnvelope = (articles = [articleSummaryFixture]) => ({
  articles,
  category: { id: 'cat-1', name: 'Claims' },
  filter: { subcategory: null },
})

describe('fetchArticles', () => {
  it('calls GET /categories/:id/articles without params', async () => {
    mockApiFetch.mockResolvedValueOnce(articlesEnvelope())
    await fetchArticles('cat-1')
    expect(mockApiFetch).toHaveBeenCalledWith('/categories/cat-1/articles')
  })

  it('appends ?subcategory= when subcategory option is provided', async () => {
    mockApiFetch.mockResolvedValueOnce(articlesEnvelope())
    await fetchArticles('cat-1', { subcategory: 'sub-1' })
    expect(mockApiFetch).toHaveBeenCalledWith('/categories/cat-1/articles?subcategory=sub-1')
  })

  it('URL-encodes subcategory values with special characters', async () => {
    mockApiFetch.mockResolvedValueOnce(articlesEnvelope())
    await fetchArticles('cat-1', { subcategory: 'life & health' })
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/categories/cat-1/articles?subcategory=life%20%26%20health'
    )
  })

  it('returns the articles array from the response envelope', async () => {
    mockApiFetch.mockResolvedValueOnce(articlesEnvelope())
    const result = await fetchArticles('cat-1')
    expect(result).toEqual([articleSummaryFixture])
  })

  it('returns empty array when category has no articles', async () => {
    mockApiFetch.mockResolvedValueOnce(articlesEnvelope([]))
    const result = await fetchArticles('cat-1')
    expect(result).toEqual([])
  })

  it('propagates apiFetch errors', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('HTTP 500'))
    await expect(fetchArticles('cat-1')).rejects.toThrow('HTTP 500')
  })
})

describe('fetchArticle', () => {
  it('calls GET /articles/:slug', async () => {
    mockApiFetch.mockResolvedValueOnce(articleDetailFixture)
    await fetchArticle('how-to-file-a-claim')
    expect(mockApiFetch).toHaveBeenCalledWith('/articles/how-to-file-a-claim')
  })

  it('returns the full article detail', async () => {
    mockApiFetch.mockResolvedValueOnce(articleDetailFixture)
    const result = await fetchArticle('how-to-file-a-claim')
    expect(result).toEqual(articleDetailFixture)
  })

  it('propagates ApiError when article slug is not found', async () => {
    const { ApiError } = jest.requireActual('@/lib/api/client')
    mockApiFetch.mockRejectedValueOnce(new ApiError('Not found', 404))
    await expect(fetchArticle('no-such-article')).rejects.toMatchObject({ status: 404 })
  })
})
