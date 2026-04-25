'use client'

import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { searchArticles } from '@/lib/api/search'
import Link from 'next/link'
import { Suspense } from 'react'

function SearchResults() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchArticles(q),
    enabled: q.length > 1,
    staleTime: 60_000,
  })

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">← Back</Link>
          <h1 className="text-lg font-semibold text-slate-800">
            {q ? `Results for "${q}"` : 'Search'}
          </h1>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && results.length === 0 && q.length > 1 && (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-2">No articles found for &ldquo;{q}&rdquo;</p>
            <Link href="/" className="text-sm text-slate-700 underline">Browse all topics</Link>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 mb-4">{results.length} articles found</p>
            {results.map((result) => (
              <Link
                key={result.article_id}
                href={`/article/${result.slug}`}
                className="block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm hover:border-slate-300 transition-all"
              >
                <h3 className="font-medium text-slate-900 mb-1">{result.title}</h3>
                <p className="text-xs text-slate-400 mb-2">
                  {result.category.name} &middot; {result.read_time_min} min read
                </p>
                <p className="text-sm text-slate-600 line-clamp-2">{result.snippet}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  )
}
