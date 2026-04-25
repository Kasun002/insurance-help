'use client'

import { useQueries } from '@tanstack/react-query'
import { fetchArticle } from '@/lib/api/articles'
import ArticleCard from './ArticleCard'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorState from '@/components/shared/ErrorState'

interface RelatedArticlesProps {
  ids: string[]
}

export default function RelatedArticles({ ids }: RelatedArticlesProps) {
  const slugsToFetch = ids.slice(0, 3)

  const results = useQueries({
    queries: slugsToFetch.map((id) => ({
      queryKey: ['article', id],
      queryFn: () => fetchArticle(id),
      staleTime: 5 * 60 * 1000,
    })),
  })

  const isLoading = results.some((r) => r.isLoading)
  const hasError = results.every((r) => r.isError)
  const articles = results.flatMap((r) => (r.data ? [r.data] : []))

  if (slugsToFetch.length === 0) return null

  return (
    <div className="mt-10 pt-6 border-t border-slate-200">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Related articles</h2>
      {isLoading ? (
        <div className="space-y-3">
          {slugsToFetch.map((id) => (
            <Skeleton key={id} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : hasError ? (
        <ErrorState message="Could not load related articles." />
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}
