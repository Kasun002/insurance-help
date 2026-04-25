import { apiFetch } from './client'
import type { ArticleSummary, ArticleDetail } from '@/types/api'

interface ArticlesResponse {
  articles: ArticleSummary[]
  category: { id: string; name: string }
  filter: { subcategory: string | null }
}

export async function fetchArticles(
  categoryId: string,
  opts?: { subcategory?: string }
): Promise<ArticleSummary[]> {
  const params = opts?.subcategory ? `?subcategory=${encodeURIComponent(opts.subcategory)}` : ''
  const data = await apiFetch<ArticlesResponse>(`/categories/${categoryId}/articles${params}`)
  return data.articles
}

export async function fetchArticle(slug: string): Promise<ArticleDetail> {
  return apiFetch<ArticleDetail>(`/articles/${slug}`)
}
