import { fetchCategories, fetchCategory } from '@/lib/api/categories'
import * as clientModule from '@/lib/api/client'
import { categoryFixture, categoryDetailFixture } from '../../fixtures'

jest.mock('@/lib/api/client', () => ({
  ...jest.requireActual('@/lib/api/client'),
  apiFetch: jest.fn(),
}))

const mockApiFetch = clientModule.apiFetch as jest.MockedFunction<typeof clientModule.apiFetch>

describe('fetchCategories', () => {
  it('calls GET /categories', async () => {
    mockApiFetch.mockResolvedValueOnce({ categories: [categoryFixture] })
    await fetchCategories()
    expect(mockApiFetch).toHaveBeenCalledWith('/categories')
  })

  it('unwraps and returns the categories array', async () => {
    mockApiFetch.mockResolvedValueOnce({ categories: [categoryFixture] })
    const result = await fetchCategories()
    expect(result).toEqual([categoryFixture])
  })

  it('returns empty array when categories is empty', async () => {
    mockApiFetch.mockResolvedValueOnce({ categories: [] })
    const result = await fetchCategories()
    expect(result).toEqual([])
  })

  it('propagates apiFetch errors', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Network error'))
    await expect(fetchCategories()).rejects.toThrow('Network error')
  })
})

describe('fetchCategory', () => {
  it('calls GET /categories/:id', async () => {
    mockApiFetch.mockResolvedValueOnce(categoryDetailFixture)
    await fetchCategory('cat-1')
    expect(mockApiFetch).toHaveBeenCalledWith('/categories/cat-1')
  })

  it('returns the full category detail including subcategories', async () => {
    mockApiFetch.mockResolvedValueOnce(categoryDetailFixture)
    const result = await fetchCategory('cat-1')
    expect(result).toEqual(categoryDetailFixture)
    expect(result.subcategories).toHaveLength(1)
  })

  it('propagates 404 ApiError when category not found', async () => {
    const { ApiError } = jest.requireActual('@/lib/api/client')
    mockApiFetch.mockRejectedValueOnce(new ApiError('Not found', 404))
    await expect(fetchCategory('nonexistent')).rejects.toMatchObject({ status: 404 })
  })
})
