import { apiFetch } from './client'
import type { SearchResult, SearchResponse } from '@/types/api'

export async function searchArticles(q: string, limit = 10): Promise<SearchResult[]> {
  const data = await apiFetch<SearchResponse>(
    `/search?q=${encodeURIComponent(q)}&limit=${limit}`
  )
  return data.results
}
